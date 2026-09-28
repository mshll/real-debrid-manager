export type TorrentStatus =
  | "magnet_error"
  | "magnet_conversion"
  | "waiting_files_selection"
  | "queued"
  | "downloading"
  | "downloaded"
  | "error"
  | "virus"
  | "compressing"
  | "uploading"
  | "dead";

export interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: "premium" | "free";
  premium: number;
  expiration: string;
}

export interface Torrent {
  id: string;
  filename: string;
  hash: string;
  bytes: number;
  host: string;
  split: number;
  progress: number;
  status: TorrentStatus;
  added: string;
  links: string[];
  ended?: string;
  speed?: number;
  seeders?: number;
}

export interface TorrentFile {
  id: number;
  path: string;
  bytes: number;
  selected: 0 | 1;
}

export interface TorrentInfo extends Torrent {
  original_filename: string;
  original_bytes: number;
  files: TorrentFile[];
}

export interface Download {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  download: string;
  streamable: 0 | 1;
  generated: string;
}

export interface Unrestricted {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: 0 | 1;
}

export interface AddedTorrent {
  id: string;
  uri: string;
}

export interface ActiveCount {
  nb: number;
  limit: number;
}

export interface HostTraffic {
  left: number;
  bytes: number;
  links: number;
  limit: number;
  type: "links" | "gigabytes" | "bytes";
  extra: number;
  reset: "daily" | "weekly" | "monthly";
}

export type Traffic = Record<string, HostTraffic>;

export interface TrafficDay {
  host: Record<string, number>;
  bytes: number;
}

export type TrafficDetails = Record<string, TrafficDay>;

export interface RdSettings {
  download_ports: string[];
  download_port: string;
  locales: Record<string, string>;
  locale: string;
  streaming_qualities: string[];
  streaming_quality: string;
  mobile_streaming_quality: string;
  streaming_languages: Record<string, string>;
  streaming_language_preference: string;
  streaming_cast_audio: string[];
  streaming_cast_audio_preference: string;
}

export type RdSettingName =
  | "download_port"
  | "locale"
  | "streaming_language_preference"
  | "streaming_quality"
  | "mobile_streaming_quality"
  | "streaming_cast_audio_preference";

export type Transcode = Partial<Record<"apple" | "dash" | "liveMP4" | "h264WebM", Record<string, string>>>;

export interface MediaStream {
  stream: string;
  lang: string;
  lang_iso: string;
  codec: string;
}

export interface MediaInfos {
  filename: string;
  hoster: string;
  link: string;
  type: "movie" | "show" | "audio";
  season?: string;
  episode?: string;
  year?: string;
  duration: number;
  bitrate: number;
  size: number;
  details: {
    video: Record<string, MediaStream & { width: number; height: number }>;
    audio: Record<string, MediaStream & { channels: number; sampling: number }>;
    subtitles: Record<string, MediaStream & { type: string }>;
  };
  poster_path?: string;
  backdrop_path?: string;
  baseUrl: string;
  availableFormats: Record<string, string>;
  availableQualities: Record<string, string>;
  modelUrl: string;
  host: string;
}
