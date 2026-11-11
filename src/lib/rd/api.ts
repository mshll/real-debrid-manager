import { rdAll, rdJson, rdRequest, type Page } from "./client";
import type {
  ActiveCount,
  AddedTorrent,
  Download,
  MediaInfos,
  RdSettingName,
  RdSettings,
  Torrent,
  TorrentInfo,
  Traffic,
  TrafficDetails,
  Transcode,
  Unrestricted,
  User,
} from "./types";

export const getUser = (): Promise<User> => rdJson("/user");

export const listTorrents = (): Promise<Page<Torrent>> => rdAll("/torrents");

export async function listRecentTorrents(limit = 50): Promise<Torrent[]> {
  const res = await rdRequest("/torrents", { query: { limit } });
  return res.status === 204 ? [] : res.json();
}

export const getTorrent = (id: string): Promise<TorrentInfo> => rdJson(`/torrents/info/${id}`);

export const addMagnet = (magnet: string): Promise<AddedTorrent> =>
  rdJson("/torrents/addMagnet", { method: "POST", form: { magnet } });

export const addTorrentFile = (file: Blob): Promise<AddedTorrent> =>
  rdJson("/torrents/addTorrent", { method: "PUT", body: file });

export async function selectFiles(id: string, fileIds: number[] | "all"): Promise<void> {
  await rdRequest(`/torrents/selectFiles/${id}`, {
    method: "POST",
    form: { files: fileIds === "all" ? "all" : fileIds.join(",") },
  });
}

export async function deleteTorrent(id: string): Promise<void> {
  await rdRequest(`/torrents/delete/${id}`, { method: "DELETE" });
}

export const getActiveCount = (): Promise<ActiveCount> => rdJson("/torrents/activeCount");

export const listDownloads = (): Promise<Page<Download>> => rdAll("/downloads");

export async function deleteDownload(id: string): Promise<void> {
  await rdRequest(`/downloads/delete/${id}`, { method: "DELETE" });
}

export const unrestrictLink = (link: string, password?: string): Promise<Unrestricted> =>
  rdJson("/unrestrict/link", { method: "POST", form: password ? { link, password } : { link } });

export const unrestrictFolder = (link: string): Promise<string[]> =>
  rdJson("/unrestrict/folder", { method: "POST", form: { link } });

export const unrestrictContainerLink = (link: string): Promise<string[]> =>
  rdJson("/unrestrict/containerLink", { method: "POST", form: { link } });

export const getTraffic = (): Promise<Traffic> => rdJson("/traffic");

export const getTrafficDetails = (start: string, end: string): Promise<TrafficDetails> =>
  rdJson("/traffic/details", { query: { start, end } });

export const getRdSettings = (): Promise<RdSettings> => rdJson("/settings");

export async function updateRdSetting(name: RdSettingName, value: string): Promise<void> {
  await rdRequest("/settings/update", { method: "POST", form: { setting_name: name, setting_value: value } });
}

export async function convertPoints(): Promise<void> {
  await rdRequest("/settings/convertPoints", { method: "POST" });
}

export const getTranscode = (id: string): Promise<Transcode> => rdJson(`/streaming/transcode/${id}`);

export const getMediaInfos = (id: string): Promise<MediaInfos> => rdJson(`/streaming/mediaInfos/${id}`);

export const getHostRegex = (): Promise<string[]> => rdJson("/hosts/regex", { auth: false });

export const getHostRegexFolder = (): Promise<string[]> => rdJson("/hosts/regexFolder", { auth: false });

export async function listActiveTorrents(): Promise<Torrent[]> {
  const res = await rdRequest("/torrents", { query: { filter: "active", limit: 100 } });
  return res.status === 204 ? [] : res.json();
}
