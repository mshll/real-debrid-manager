/**
 * Real-Debrid Streaming API endpoints
 */

import { get } from "./client";

/**
 * Transcoding quality options returned by the API
 * Key is the quality name (e.g., "apple", "dash", "liveMP4", "h264WebM")
 */
export interface TranscodeQuality {
  [quality: string]: {
    full: string; // Full quality URL
    [resolution: string]: string; // Other resolutions
  };
}

/**
 * Video stream information
 */
export interface VideoInfo {
  stream: string;
  lang: string;
  lang_iso: string;
  codec: string;
  colorspace: string;
  width: number;
  height: number;
}

/**
 * Audio stream information
 */
export interface AudioInfo {
  stream: string;
  lang: string;
  lang_iso: string;
  codec: string;
  sampling: number;
  channels: number;
}

/**
 * Subtitle information
 */
export interface SubtitleInfo {
  stream: string;
  lang: string;
  lang_iso: string;
  type: string;
}

/**
 * Media information for a file
 */
export interface MediaInfo {
  filename: string;
  hoster: string;
  link: string;
  type: string;
  season?: string;
  episode?: string;
  year?: string;
  duration: number;
  bitrate: number;
  size: number;
  video: Record<string, VideoInfo>;
  audio: Record<string, AudioInfo>;
  subtitles: Record<string, SubtitleInfo>;
  model_name: string;
  poster_path: string;
  audio_image: string;
  backdrop_path: string;
}

/**
 * Get transcoding links for a file
 * GET /streaming/transcode/{id}
 *
 * @param token - API token
 * @param id - File ID from unrestricted link
 * @returns Available transcode quality options
 */
export async function getTranscodeLinks(
  token: string,
  id: string
): Promise<TranscodeQuality> {
  return get<TranscodeQuality>(`/streaming/transcode/${id}`, token);
}

/**
 * Get media information for a file
 * GET /streaming/mediaInfos/{id}
 *
 * @param token - API token
 * @param id - File ID from unrestricted link
 * @returns Detailed media information
 */
export async function getMediaInfo(
  token: string,
  id: string
): Promise<MediaInfo> {
  return get<MediaInfo>(`/streaming/mediaInfos/${id}`, token);
}
