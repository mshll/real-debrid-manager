import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { isActive } from "./format";
import {
  getRdSettings,
  getTorrent,
  getTraffic,
  getTrafficDetails,
  getUser,
  listActiveTorrents,
  listDownloads,
  listRecentTorrents,
  listTorrents,
} from "./rd/api";
import type { Download, RdSettings, Torrent, TorrentInfo, Traffic, TrafficDetails, User } from "./rd/types";
import { libraryStampItem } from "./storage";

export const keys = {
  user: ["user"],
  torrents: ["torrents"],
  activeTorrents: ["torrents", "active"],
  recentTorrents: ["torrents", "recent"],
  torrent: (id: string) => ["torrent", id],
  downloads: ["downloads"],
  traffic: ["traffic"],
  trafficDetails: (start: string, end: string) => ["traffic", start, end],
  rdSettings: ["rdSettings"],
} as const;

const LIVE_MS = 3000;

export function useUser(): UseQueryResult<User> {
  return useQuery({ queryKey: keys.user, queryFn: getUser, staleTime: 60_000 });
}

export function useRecentTorrents(limit = 20): UseQueryResult<Torrent[]> {
  return useQuery({
    queryKey: [...keys.recentTorrents, limit],
    queryFn: () => listRecentTorrents(limit),
    refetchInterval: (query) => (query.state.data?.some((t) => isActive(t.status)) ? LIVE_MS : 30_000),
  });
}

/**
 * Full library is heavy on big accounts, so it refreshes slowly while the
 * active subset polls fast and is merged on top.
 */
export function useLibrary(): { torrents: Torrent[]; isLoading: boolean; error: Error | null } {
  const queryClient = useQueryClient();
  const all = useQuery({
    queryKey: keys.torrents,
    queryFn: async () => (await listTorrents()).items,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
  const active = useQuery({
    queryKey: keys.activeTorrents,
    queryFn: listActiveTorrents,
    refetchInterval: (query) => (query.state.data?.length ? LIVE_MS : 30_000),
  });

  const previousActive = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = new Set((active.data ?? []).map((t) => t.id));
    const finished = [...previousActive.current].some((id) => !ids.has(id));
    previousActive.current = ids;
    if (finished) queryClient.invalidateQueries({ queryKey: keys.torrents, exact: true }).catch(console.error);
  }, [active.data, queryClient]);

  const torrents = useMemo(() => {
    const live = new Map((active.data ?? []).map((t) => [t.id, t]));
    const merged = (all.data ?? []).map((t) => live.get(t.id) ?? t);
    const known = new Set(merged.map((t) => t.id));
    return [...(active.data ?? []).filter((t) => !known.has(t.id)), ...merged];
  }, [all.data, active.data]);

  return { torrents, isLoading: all.isLoading, error: all.error };
}

export function useTorrent(id: string | null): UseQueryResult<TorrentInfo> {
  return useQuery({
    queryKey: keys.torrent(id ?? ""),
    queryFn: () => getTorrent(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isActive(query.state.data.status) ? LIVE_MS : false),
  });
}

export function useDownloads(): UseQueryResult<Download[]> {
  return useQuery({ queryKey: keys.downloads, queryFn: async () => (await listDownloads()).items, staleTime: 30_000 });
}

export function useTraffic(): UseQueryResult<Traffic> {
  return useQuery({ queryKey: keys.traffic, queryFn: getTraffic, staleTime: 60_000, retry: false });
}

export function useTrafficDetails(start: string, end: string): UseQueryResult<TrafficDetails> {
  return useQuery({
    queryKey: keys.trafficDetails(start, end),
    queryFn: () => getTrafficDetails(start, end),
    staleTime: 300_000,
    retry: false,
  });
}

export function useRdSettings(): UseQueryResult<RdSettings> {
  return useQuery({ queryKey: keys.rdSettings, queryFn: getRdSettings, staleTime: 300_000, retry: false });
}

/** Refetches library data when the worker reports a change. */
export function useLibraryStampSync(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      libraryStampItem.watch(() => {
        queryClient.invalidateQueries({ queryKey: keys.torrents }).catch(console.error);
        queryClient.invalidateQueries({ queryKey: keys.downloads }).catch(console.error);
      }),
    [queryClient],
  );
}
