import type { Route } from "playwright";

import type {
  Download,
  RdSettings,
  Torrent,
  TorrentFile,
  TorrentInfo,
  TorrentStatus,
  Traffic,
  TrafficDetails,
  User,
} from "../src/lib/rd/types";

const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const GB = 1_000_000_000;
const MB = 1_000_000;

let seed = 42;
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const rdId = (): string => Array.from({ length: 13 }, () => ALNUM[Math.floor(random() * ALNUM.length)]).join("");
const hash = (): string => Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(random() * 16)]).join("");
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d+Z$/, ".000Z");
const link = (): string => `https://real-debrid.com/d/${rdId()}`;

const AVATAR = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#9ED1EC"/><text x="32" y="41" font-family="Helvetica" font-size="26" font-weight="600" text-anchor="middle" fill="#1d3a4a">DB</text></svg>`,
)}`;

const PREMIUM_SECONDS = 24 * 86400 + 7 * 3600;

export const user: User = {
  id: 4812297,
  username: "debrid-user",
  email: "you@example.com",
  points: 1250,
  locale: "en",
  avatar: AVATAR,
  type: "premium",
  premium: PREMIUM_SECONDS,
  expiration: iso(NOW + PREMIUM_SECONDS * 1000),
};

interface Spec {
  filename: string;
  status: TorrentStatus;
  ageHours: number;
  bytes?: number;
  files?: { path: string; bytes: number; selected?: 0 | 1 }[];
  links?: number;
  progress?: number;
  speed?: number;
  seeders?: number;
  hash?: string;
}

const PACK = "Blender.Open.Movies.Collection.1080p.WEB-DL.x264";
const PACK_TITLES = [
  "Elephants.Dream.2006",
  "Big.Buck.Bunny.2008",
  "Sintel.2010",
  "Tears.of.Steel.2012",
  "Cosmos.Laundromat.2015",
  "Caminandes.Llamigos.2016",
  "Agent.327.2017",
  "Spring.2019",
  "Coffee.Run.2020",
  "Sprite.Fright.2021",
];
const packFiles = [
  ...PACK_TITLES.map((title, i) => ({
    path: `/${PACK}/Blender.Open.Movies.E${String(i + 1).padStart(2, "0")}.${title}.1080p.WEB-DL.x264.mkv`,
    bytes: Math.round(3.4 * GB * (0.85 + random() * 0.3)),
  })),
  { path: `/${PACK}/Sample/elephants.dream.sample.mkv`, bytes: 48 * MB, selected: 0 as const },
  { path: `/${PACK}/${PACK}.nfo`, bytes: 6_214, selected: 0 as const },
];

const EARTH = "NASA.Earth.Views.S01.2160p.WEB-DL.HDR.x265";
const earthFiles = [
  ...Array.from({ length: 9 }, (_, i) => ({
    path: `/${EARTH}/NASA.Earth.Views.S01E${String(i + 1).padStart(2, "0")}.2160p.WEB-DL.HDR.x265.mkv`,
    bytes: Math.round(6.1 * GB * (0.9 + random() * 0.2)),
  })),
  { path: `/${EARTH}/${EARTH}.nfo`, bytes: 4_882, selected: 0 as const },
];

const ALBUM = "Nine Inch Nails - The Slip (2008) [FLAC 24-96]";
const albumTracks = [
  "999,999",
  "1,000,000",
  "Letting You",
  "Discipline",
  "Echoplex",
  "Head Down",
  "Lights in the Sky",
  "Corona Radiata",
  "The Four of Us Are Dying",
  "Demon Seed",
];
const albumFiles = [
  ...albumTracks.map((track, i) => ({
    path: `/${ALBUM}/${String(i + 1).padStart(2, "0")}. ${track}.flac`,
    bytes: Math.round(95 * MB * (0.6 + random() * 0.8)),
  })),
  { path: `/${ALBUM}/cover.jpg`, bytes: 2_431_882 },
  { path: `/${ALBUM}/Nine Inch Nails - The Slip.log`, bytes: 8_312 },
  { path: `/${ALBUM}/Nine Inch Nails - The Slip.cue`, bytes: 1_904 },
];

const NOTLD = "Night.of.the.Living.Dead.1968.1080p.BluRay.x264";
const notldFiles = [
  { path: `/${NOTLD}/${NOTLD}.mkv`, bytes: 5.87 * GB, selected: 0 as const },
  { path: `/${NOTLD}/Sample/sample.mkv`, bytes: 31 * MB, selected: 0 as const },
  { path: `/${NOTLD}/Subs/English.srt`, bytes: 162_401, selected: 0 as const },
  { path: `/${NOTLD}/Subs/French.srt`, bytes: 171_022, selected: 0 as const },
  { path: `/${NOTLD}/Subs/Spanish.srt`, bytes: 168_774, selected: 0 as const },
  { path: `/${NOTLD}/README.txt`, bytes: 1_204, selected: 0 as const },
  { path: `/${NOTLD}/${NOTLD}.nfo`, bytes: 9_822, selected: 0 as const },
];

const BUNNY_HASH = hash();

const SPECS: Spec[] = [
  {
    filename: "Sintel.2010.2160p.WEB-DL.x265.mkv",
    status: "downloading",
    ageHours: 0.3,
    bytes: 2.41 * GB,
    progress: 47.3,
    speed: 18_400_000,
    seeders: 142,
  },
  {
    filename: "Cosmos.Laundromat.2015.2160p.WEB-DL.HDR.x265",
    status: "downloading",
    ageHours: 0.6,
    bytes: 58.2 * GB,
    progress: 12.8,
    speed: 5_230_000,
    seeders: 38,
  },
  {
    filename: "Metropolis.1927.Restored.1080p.BluRay.x265",
    status: "magnet_conversion",
    ageHours: 0.1,
    bytes: 0,
    progress: 0,
  },
  { filename: NOTLD, status: "waiting_files_selection", ageHours: 0.9, bytes: 0, files: notldFiles },
  { filename: "ubuntu-24.04.1-desktop-amd64.iso", status: "queued", ageHours: 1.2, bytes: 6.11 * GB, progress: 0 },
  {
    filename: "Tears.of.Steel.2012.2160p.WEB-DL.HDR.x265.mkv",
    status: "compressing",
    ageHours: 1.5,
    bytes: 22.7 * GB,
    progress: 64,
  },
  { filename: PACK, status: "downloaded", ageHours: 3, files: packFiles, links: 10 },
  {
    filename: "Nosferatu.1922.REMASTERED.2160p.UHD.BluRay.REMUX.HEVC.mkv",
    status: "downloaded",
    ageHours: 7,
    bytes: 74.3 * GB,
    links: 1,
  },
  {
    filename: "Prelinger.Archives.Collection.720p.WEB-DL.x264",
    status: "error",
    ageHours: 11,
    bytes: 118 * GB,
    progress: 3,
  },
  { filename: EARTH, status: "downloaded", ageHours: 26, files: earthFiles, links: 9 },
  {
    filename: "The.General.1926.1080p.BluRay.x264.FLAC.mkv",
    status: "downloaded",
    ageHours: 30,
    bytes: 14.2 * GB,
    links: 1,
  },
  {
    filename: "Big.Buck.Bunny.2008.2160p.60fps.WEB-DL.x264.mkv",
    status: "downloaded",
    ageHours: 40,
    bytes: 17.9 * GB,
    links: 1,
    hash: BUNNY_HASH,
  },
  {
    filename: "Plan.9.from.Outer.Space.1957.1080p.BluRay.x264",
    status: "dead",
    ageHours: 52,
    bytes: 9.4 * GB,
    progress: 0,
  },
  { filename: ALBUM, status: "downloaded", ageHours: 60, files: albumFiles, links: 1 },
  {
    filename: "Elephants.Dream.2006.2160p.WEB-DL.x265.mkv",
    status: "downloaded",
    ageHours: 75,
    bytes: 8.3 * GB,
    links: 1,
  },
  {
    filename: "Fedora-Workstation-Live-x86_64-41",
    status: "virus",
    ageHours: 90,
    bytes: 3.9 * GB,
    progress: 100,
  },
  {
    filename: "Spring.2019.2160p.WEB-DL.x265.mkv",
    status: "downloaded",
    ageHours: 120,
    bytes: 4.7 * GB,
    links: 1,
  },
  {
    filename: "Charge.2022.1080p.WEB-DL.x264.mkv",
    status: "downloaded",
    ageHours: 150,
    bytes: 6.4 * GB,
    links: 1,
  },
  { filename: "", status: "magnet_error", ageHours: 170, bytes: 0, progress: 0 },
  {
    filename: "His.Girl.Friday.1940.1080p.BluRay.x264.mkv",
    status: "downloaded",
    ageHours: 200,
    bytes: 11.1 * GB,
    links: 1,
  },
  { filename: "blender-4.2.1-linux-x64.tar.xz", status: "downloaded", ageHours: 260, bytes: 341 * MB, links: 1 },
  {
    filename: "Big.Buck.Bunny.2008.2160p.60fps.WEB-DL.x264.mkv",
    status: "downloaded",
    ageHours: 300,
    bytes: 17.9 * GB,
    links: 1,
    hash: BUNNY_HASH,
  },
  {
    filename: "Caminandes.Llamigos.2016.2160p.WEB-DL.x265.mkv",
    status: "downloaded",
    ageHours: 380,
    bytes: 7.6 * GB,
    links: 1,
  },
  {
    filename: "Agent.327.Operation.Barbershop.2017.1080p.WEB-DL.x264.mkv",
    status: "downloaded",
    ageHours: 500,
    bytes: 5.3 * GB,
    links: 1,
  },
  {
    filename: "Sprite.Fright.2021.2160p.WEB-DL.HDR.x265.mkv",
    status: "downloaded",
    ageHours: 900,
    bytes: 9.8 * GB,
    links: 1,
  },
];

function buildInfo(spec: Spec): TorrentInfo {
  const id = rdId();
  const added = NOW - spec.ageHours * HOUR;
  const files: TorrentFile[] = (spec.files ?? [{ path: `/${spec.filename || "unknown"}`, bytes: spec.bytes ?? 0 }]).map(
    (file, index) => ({
      id: index + 1,
      path: file.path,
      bytes: Math.round(file.bytes),
      selected: file.selected ?? (spec.status === "waiting_files_selection" ? 0 : 1),
    }),
  );
  const selectedBytes = files.filter((f) => f.selected).reduce((sum, f) => sum + f.bytes, 0);
  const allBytes = files.reduce((sum, f) => sum + f.bytes, 0);
  const bytes = spec.status === "waiting_files_selection" || spec.status === "magnet_conversion" ? 0 : selectedBytes;
  const downloaded = spec.status === "downloaded";
  return {
    id,
    filename: spec.filename,
    original_filename: spec.filename,
    hash: spec.hash ?? hash(),
    bytes,
    original_bytes: spec.status === "magnet_conversion" ? 0 : allBytes,
    host: "real-debrid.com",
    split: 2000,
    progress: downloaded ? 100 : (spec.progress ?? 0),
    status: spec.status,
    added: iso(added),
    links: Array.from({ length: spec.links ?? 0 }, link),
    ...(downloaded && { ended: iso(added + (0.2 + random()) * HOUR) }),
    ...(spec.speed !== undefined && { speed: spec.speed }),
    ...(spec.seeders !== undefined && { seeders: spec.seeders }),
    files: spec.status === "magnet_conversion" ? [] : files,
  };
}

export const torrentInfos: TorrentInfo[] = SPECS.map(buildInfo).sort(
  (a, b) => Date.parse(b.added) - Date.parse(a.added),
);

export const torrents: Torrent[] = torrentInfos.map(
  ({ original_filename: _name, original_bytes: _bytes, files: _files, ...torrent }) => torrent,
);

export const ids = {
  seasonPack: torrentInfos.find((t) => t.filename === PACK)!.id,
  waiting: torrentInfos.find((t) => t.status === "waiting_files_selection")!.id,
};

export const FAILED_STATUSES: TorrentStatus[] = ["magnet_error", "error", "virus", "dead"];
export const failedCount = torrents.filter((t) => FAILED_STATUSES.includes(t.status)).length;
const ACTIVE_STATUSES: TorrentStatus[] = [
  "magnet_conversion",
  "waiting_files_selection",
  "queued",
  "downloading",
  "compressing",
  "uploading",
];
export const activeTorrents = torrents.filter((t) => ACTIVE_STATUSES.includes(t.status));

const DOWNLOAD_SPECS: [string, string, string, number, number][] = [
  [
    "Blender.Open.Movies.E10.Sprite.Fright.2021.1080p.WEB-DL.x264.mkv",
    "real-debrid.com",
    "video/x-matroska",
    3.6 * GB,
    3.2,
  ],
  [
    "Blender.Open.Movies.E09.Coffee.Run.2020.1080p.WEB-DL.x264.mkv",
    "real-debrid.com",
    "video/x-matroska",
    3.3 * GB,
    3.2,
  ],
  ["Nosferatu.1922.REMASTERED.2160p.UHD.BluRay.REMUX.HEVC.mkv", "real-debrid.com", "video/x-matroska", 74.3 * GB, 7.5],
  ["Proxmox-VE-8.2-ISO-Installer.iso", "1fichier.com", "application/x-iso9660-image", 1.34 * GB, 9],
  ["NASA.Earth.Views.S01E03.2160p.WEB-DL.HDR.x265.mkv", "real-debrid.com", "video/x-matroska", 6.2 * GB, 26],
  ["Blender_Studio_Textures_2024.zip", "rapidgator.net", "application/zip", 812 * MB, 29],
  ["The.General.1926.1080p.BluRay.x264.FLAC.mkv", "real-debrid.com", "video/x-matroska", 14.2 * GB, 31],
  [
    "Nine Inch Nails - The Slip (2008) [FLAC 24-96].rar",
    "real-debrid.com",
    "application/x-rar-compressed",
    1.72 * GB,
    61,
  ],
  ["NASA.Hubble.Images.4K.part1.rar", "mega.nz", "application/x-rar-compressed", 2.1 * GB, 70],
  ["NASA.Hubble.Images.4K.part2.rar", "mega.nz", "application/x-rar-compressed", 1.4 * GB, 70.1],
  ["Elephants.Dream.2006.2160p.WEB-DL.x265.mkv", "real-debrid.com", "video/x-matroska", 8.3 * GB, 76],
  ["Blender-4.2.1-macos-arm64.dmg", "uptobox.com", "application/x-apple-diskimage", 3.4 * GB, 102],
  ["Charge.2022.1080p.WEB-DL.x264.mkv", "real-debrid.com", "video/x-matroska", 6.4 * GB, 151],
  ["NASA_Apollo_11_Press_Kit_1969.pdf", "1fichier.com", "application/pdf", 88 * MB, 240],
  ["Agent.327.Operation.Barbershop.2017.1080p.WEB-DL.x264.mkv", "real-debrid.com", "video/x-matroska", 5.3 * GB, 501],
];

/** File names the hoster links on the fake scanned page unlock to. */
const UNLOCKED_NAMES: Record<string, string> = {
  "https://1fichier.com/?k9x2m4p7q1&af=1": "debian-12.7.0-amd64-DVD-1.iso",
  "https://1fichier.com/?b3v8n1z5c6": "Charge.2022.2160p.WEB-DL.x265.mkv",
  "https://rapidgator.net/?file/4f2a9c/Tears.of.Steel.2012.mkv.html": "Tears.of.Steel.2012.1080p.WEB-DL.x264.mkv",
};

export const downloads: Download[] = DOWNLOAD_SPECS.map(([filename, host, mimeType, filesize, ageHours]) => {
  const id = rdId();
  return {
    id,
    filename,
    mimeType,
    filesize: Math.round(filesize),
    link: host === "real-debrid.com" ? link() : `https://${host}/file/${rdId().toLowerCase()}`,
    host,
    chunks: host === "real-debrid.com" ? 16 : 4,
    download: `https://sgp${1 + Math.floor(random() * 8)}.download.real-debrid.com/d/${id}/${encodeURIComponent(filename)}`,
    streamable: mimeType.startsWith("video/") ? 1 : 0,
    generated: iso(NOW - ageHours * HOUR),
  };
});

export const traffic: Traffic = {
  "real-debrid.com": { left: 0, bytes: 412 * GB, links: 318, limit: 0, type: "gigabytes", extra: 0, reset: "daily" },
  "1fichier.com": { left: 62 * GB, bytes: 38 * GB, links: 7, limit: 100 * GB, type: "bytes", extra: 0, reset: "daily" },
  "rapidgator.net": { left: 18, bytes: 4.2 * GB, links: 2, limit: 20, type: "links", extra: 0, reset: "daily" },
  "ddownload.com": {
    left: 0.4 * 1024 ** 3,
    bytes: 0.6 * GB,
    links: 3,
    limit: 1,
    type: "gigabytes",
    extra: 0,
    reset: "daily",
  },
  "uptobox.com": { left: 0, bytes: 3.4 * GB, links: 1, limit: 0, type: "gigabytes", extra: 0, reset: "daily" },
};

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function trafficDetails(start: string | null, end: string | null): TrafficDetails {
  const from = start ? Date.parse(`${start}T00:00:00Z`) : NOW - 30 * DAY;
  const to = end ? Date.parse(`${end}T00:00:00Z`) : NOW;
  const out: TrafficDetails = {};
  let day = 0;
  for (let t = from; t <= to; t += DAY, day++) {
    if (day % 9 === 4) continue;
    const weekend = [0, 6].includes(new Date(t).getUTCDay());
    const base = (weekend ? 38 : 14) * GB * (0.2 + ((day * 37) % 17) / 12);
    const rd = Math.round(base * 0.8);
    const fichier = day % 3 === 0 ? Math.round(base * 0.15) : 0;
    const rapid = day % 5 === 0 ? Math.round(base * 0.05) : 0;
    const host: Record<string, number> = { "real-debrid.com": rd };
    if (fichier) host["1fichier.com"] = fichier;
    if (rapid) host["rapidgator.net"] = rapid;
    out[isoDay(t)] = { host, bytes: rd + fichier + rapid };
  }
  return out;
}

export const rdSettings: RdSettings = {
  download_ports: ["normal", "secured"],
  download_port: "secured",
  locales: {
    en: "English",
    fr: "Français",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ar: "العربية",
  },
  locale: "en",
  streaming_qualities: ["original", "2160", "1080", "720", "480", "360"],
  streaming_quality: "original",
  mobile_streaming_quality: "720",
  streaming_languages: { en: "English", fr: "French", es: "Spanish", de: "German", ja: "Japanese", ar: "Arabic" },
  streaming_language_preference: "en",
  streaming_cast_audio: ["original", "dolby", "aac"],
  streaming_cast_audio_preference: "original",
};

const HOST_DOMAINS = [
  "1fichier\\.com",
  "rapidgator\\.net",
  "mega\\.nz",
  "uptobox\\.com",
  "ddownload\\.com",
  "katfile\\.com",
];
export const hostRegex = HOST_DOMAINS.map(
  (domain) => `/(http|https):\\/\\/(\\w+\\.)?${domain}\\/\\?([^( |"|'|>|<|\\r\\n\\|\\r|\\n|:|$)]+)/`,
);
export const hostRegexFolder = [
  `/(http|https):\\/\\/(\\w+\\.)?1fichier\\.com\\/dir\\/([^( |"|'|>|<|\\r\\n\\|\\r|\\n|:|$)]+)/`,
  `/(http|https):\\/\\/(\\w+\\.)?mega\\.nz\\/folder\\/([^( |"|'|>|<|\\r\\n\\|\\r|\\n|:|$)]+)/`,
];

export interface MockLog {
  handled: { method: string; path: string; fromServiceWorker: boolean }[];
  unmocked: string[];
}

const json = (route: Route, body: unknown, headers: Record<string, string> = {}): Promise<void> =>
  route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(body) });

function paged<T>(route: Route, all: T[], url: URL): Promise<void> {
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const page = Number(url.searchParams.get("page") ?? 1);
  const slice = all.slice((page - 1) * limit, page * limit);
  if (!slice.length) return route.fulfill({ status: 204, body: "" });
  return json(route, slice, { "X-Total-Count": String(all.length) });
}

/** Answers every Real-Debrid endpoint the extension uses; anything else is logged as unmocked. */
export function handleRd(log: MockLog) {
  return async (route: Route): Promise<void> => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(/^\/rest\/1\.0/, "");
    log.handled.push({ method, path: `${path}${url.search}`, fromServiceWorker: request.serviceWorker() !== null });

    if (url.pathname.startsWith("/rest/1.0/")) {
      if (method === "GET" && path === "/user") return json(route, user);
      if (method === "GET" && path === "/torrents") {
        const filter = url.searchParams.get("filter");
        if (filter === "active") return paged(route, activeTorrents, url);
        // A real account's full-library page came back with empty links; the UI must fetch them from info.
        const fullLibrary = Number(url.searchParams.get("limit") ?? 100) >= 1000;
        return paged(route, fullLibrary ? torrents.map((t) => ({ ...t, links: [] })) : torrents, url);
      }
      if (method === "GET" && path === "/torrents/activeCount")
        return json(route, { nb: activeTorrents.length, limit: 35 });
      const info = path.match(/^\/torrents\/info\/(\w+)$/);
      if (method === "GET" && info) {
        const found = torrentInfos.find((t) => t.id === info[1]);
        return found
          ? json(route, found)
          : route.fulfill({
              status: 404,
              contentType: "application/json",
              body: '{"error":"unknown_ressource","error_code":7}',
            });
      }
      if (method === "GET" && path === "/downloads") return paged(route, downloads, url);
      if (method === "POST" && path === "/unrestrict/link") {
        const link = new URLSearchParams(request.postData() ?? "").get("link") ?? "";
        const id = link.split("/").pop() ?? "LINK";
        return json(route, {
          id,
          filename: UNLOCKED_NAMES[link] ?? `${id}.mkv`,
          mimeType: "video/x-matroska",
          filesize: 1024 ** 3,
          link,
          host: "real-debrid.com",
          chunks: 32,
          crc: 1,
          download: `https://download.real-debrid.com/d/${id}/file.mkv`,
          streamable: 1,
        });
      }
      if (method === "GET" && path === "/traffic") return json(route, traffic);
      if (method === "GET" && path === "/traffic/details")
        return json(route, trafficDetails(url.searchParams.get("start"), url.searchParams.get("end")));
      if (method === "GET" && path === "/settings") return json(route, rdSettings);
      if (method === "GET" && path === "/hosts/regex") return json(route, hostRegex);
      if (method === "GET" && path === "/hosts/regexFolder") return json(route, hostRegexFolder);
    }

    log.unmocked.push(`${method} ${url.pathname}${url.search}`);
    console.error(`\x1b[31m[mock] UNMOCKED Real-Debrid request: ${method} ${request.url()}\x1b[0m`);
    // 501, never 401: a 401 makes the extension drop its auth and every later screenshot would be the sign-in page.
    return route.fulfill({
      status: 501,
      contentType: "application/json",
      body: JSON.stringify({ error: "unmocked_in_e2e", error_code: -1 }),
    });
  };
}
