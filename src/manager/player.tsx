import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useActions } from "@/hooks/use-actions";
import { useDownloads } from "@/lib/queries";
import { getMediaInfos, getTranscode } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";

interface Track {
  id: number;
  name: string;
}

export function PlayerView({ id }: { id: string }): ReactNode {
  const transcode = useQuery({
    queryKey: ["transcode", id],
    queryFn: () => getTranscode(id),
    staleTime: Infinity,
    retry: false,
  });
  const media = useQuery({
    queryKey: ["mediaInfos", id],
    queryFn: () => getMediaInfos(id),
    staleTime: Infinity,
    retry: false,
  });
  const { data: downloads } = useDownloads();
  const actions = useActions();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [audioTrack, setAudioTrack] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState<Track[]>([]);
  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const original = downloads?.find((download) => download.id === id);
  const title = media.data?.filename ?? original?.filename ?? "Playing";
  const hlsSource = transcode.data?.apple ? Object.values(transcode.data.apple)[0] : undefined;
  const mp4Source = transcode.data?.liveMP4 ? Object.values(transcode.data.liveMP4)[0] : undefined;

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || (!hlsSource && !mp4Source)) return;
    if (hlsSource && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setAudioTracks(
          hls.audioTracks.map((track, index) => ({
            id: index,
            name: track.name || track.lang || `Track ${index + 1}`,
          })),
        );
        setSubtitleTracks(
          hls.subtitleTracks.map((track, index) => ({
            id: index,
            name: track.name || track.lang || `Subtitle ${index + 1}`,
          })),
        );
        video.play().catch((error: unknown) => console.info("Autoplay blocked", error));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setPlaybackError(data.details);
      });
      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }
    video.src = hlsSource && video.canPlayType("application/vnd.apple.mpegurl") ? hlsSource : (mp4Source ?? "");
    video.play().catch((error: unknown) => console.info("Autoplay blocked", error));
    return undefined;
  }, [hlsSource, mp4Source]);

  const error = transcode.error ?? (playbackError ? new Error(`Playback failed (${playbackError})`) : null);

  return (
    <div data-theme="dark" className="flex h-screen flex-col bg-black text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 px-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-3.5" />} onClick={() => history.back()}>
          Back
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</h1>
        {audioTracks.length > 1 && (
          <Select
            label="Audio"
            value={String(audioTrack)}
            className="w-40"
            options={audioTracks.map((track) => ({ value: String(track.id), label: track.name }))}
            onChange={(value) => {
              const next = Number(value);
              setAudioTrack(next);
              if (hlsRef.current) hlsRef.current.audioTrack = next;
            }}
          />
        )}
        {subtitleTracks.length > 0 && (
          <Select
            label="Subtitles"
            value={String(subtitleTrack)}
            className="w-40"
            options={[
              { value: "-1", label: "Subtitles off" },
              ...subtitleTracks.map((track) => ({ value: String(track.id), label: track.name })),
            ]}
            onChange={(value) => {
              const next = Number(value);
              setSubtitleTrack(next);
              if (hlsRef.current) hlsRef.current.subtitleTrack = next;
            }}
          />
        )}
        {original && (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy className="size-3.5" />}
              onClick={() => actions.copy([original.download])}
            >
              Copy link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="size-3.5" />}
              onClick={() => actions.download([original.download])}
            >
              Download
            </Button>
          </>
        )}
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {error ? (
          <div className="max-w-sm text-center">
            <p className="text-[14px] font-medium">Can't stream this file</p>
            <p className="mt-1 text-[12.5px] text-fg-2">{errorMessage(error)}</p>
          </div>
        ) : (
          <video ref={videoRef} controls className="max-h-full w-full" poster={media.data?.backdrop_path} />
        )}
      </div>
    </div>
  );
}
