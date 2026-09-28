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

const SEVERANCE = "Severance.S02.1080p.ATVP.WEB-DL.DDP5.1.H.264-NTb";
const severanceFiles = [
  ...Array.from({ length: 10 }, (_, i) => ({
    path: `/${SEVERANCE}/Severance.S02E${String(i + 1).padStart(2, "0")}.1080p.ATVP.WEB-DL.DDP5.1.H.264-NTb.mkv`,
    bytes: Math.round(3.4 * GB * (0.85 + random() * 0.3)),
  })),
  { path: `/${SEVERANCE}/Sample/severance.s02e01.sample.mkv`, bytes: 48 * MB, selected: 0 as const },
  { path: `/${SEVERANCE}/Severance.S02.1080p.ATVP.WEB-DL.DDP5.1.H.264-NTb.nfo`, bytes: 6_214, selected: 0 as const },
];

const ARCANE = "Arcane.S02.2160p.NF.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX";
const arcaneFiles = [
  ...Array.from({ length: 9 }, (_, i) => ({
    path: `/${ARCANE}/Arcane.S02E${String(i + 1).padStart(2, "0")}.2160p.NF.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv`,
    bytes: Math.round(6.1 * GB * (0.9 + random() * 0.2)),
  })),
  {
    path: `/${ARCANE}/Arcane.S02.2160p.NF.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.nfo`,
    bytes: 4_882,
    selected: 0 as const,
  },
];

const OKC = "Radiohead - OK Computer OKNOTOK 1997 2017 (2017) [FLAC 24-96]";
const okcTracks = [
  "Airbag",
  "Paranoid Android",
  "Subterranean Homesick Alien",
  "Exit Music (For a Film)",
  "Let Down",
  "Karma Police",
  "Fitter Happier",
  "Electioneering",
  "Climbing Up the Walls",
  "No Surprises",
  "Lucky",
  "The Tourist",
];
const okcFiles = [
  ...okcTracks.map((track, i) => ({
    path: `/${OKC}/CD1/${String(i + 1).padStart(2, "0")}. ${track}.flac`,
    bytes: Math.round(95 * MB * (0.6 + random() * 0.8)),
  })),
  { path: `/${OKC}/cover.jpg`, bytes: 2_431_882 },
  { path: `/${OKC}/Radiohead - OK Computer.log`, bytes: 8_312 },
  { path: `/${OKC}/Radiohead - OK Computer.cue`, bytes: 1_904 },
];

const OPPENHEIMER = "Oppenheimer.2023.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265";
const oppenheimerFiles = [
  { path: `/${OPPENHEIMER}/${OPPENHEIMER}.mkv`, bytes: 5.87 * GB, selected: 0 as const },
  { path: `/${OPPENHEIMER}/Sample/sample.mkv`, bytes: 31 * MB, selected: 0 as const },
  { path: `/${OPPENHEIMER}/Subs/English.srt`, bytes: 162_401, selected: 0 as const },
  { path: `/${OPPENHEIMER}/Subs/French.srt`, bytes: 171_022, selected: 0 as const },
  { path: `/${OPPENHEIMER}/Subs/Spanish.srt`, bytes: 168_774, selected: 0 as const },
  { path: `/${OPPENHEIMER}/GalaxyRG.txt`, bytes: 1_204, selected: 0 as const },
  { path: `/${OPPENHEIMER}/${OPPENHEIMER}.nfo`, bytes: 9_822, selected: 0 as const },
];

const INTERSTELLAR_HASH = hash();

const SPECS: Spec[] = [
  {
    filename: "The.Bear.S03E01.Tomorrow.1080p.DSNP.WEB-DL.DDP5.1.H.264-FLUX.mkv",
    status: "downloading",
    ageHours: 0.3,
    bytes: 2.41 * GB,
    progress: 47.3,
    speed: 18_400_000,
    seeders: 142,
  },
  {
    filename: "Shogun.2024.S01.2160p.DSNP.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX",
    status: "downloading",
    ageHours: 0.6,
    bytes: 58.2 * GB,
    progress: 12.8,
    speed: 5_230_000,
    seeders: 38,
  },
  {
    filename: "Blade.Runner.2049.2017.1080p.BluRay.x265-RARBG",
    status: "magnet_conversion",
    ageHours: 0.1,
    bytes: 0,
    progress: 0,
  },
  { filename: OPPENHEIMER, status: "waiting_files_selection", ageHours: 0.9, bytes: 0, files: oppenheimerFiles },
  { filename: "ubuntu-24.04.1-desktop-amd64.iso", status: "queued", ageHours: 1.2, bytes: 6.11 * GB, progress: 0 },
  {
    filename: "Furiosa.A.Mad.Max.Saga.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv",
    status: "compressing",
    ageHours: 1.5,
    bytes: 22.7 * GB,
    progress: 64,
  },
  { filename: SEVERANCE, status: "downloaded", ageHours: 3, files: severanceFiles, links: 10 },
  {
    filename: "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR.HEVC.TrueHD.Atmos.7.1-FGT.mkv",
    status: "downloaded",
    ageHours: 7,
    bytes: 74.3 * GB,
    links: 1,
  },
  {
    filename: "The.Office.US.S01-S09.COMPLETE.720p.WEB-DL.x264-GROUP",
    status: "error",
    ageHours: 11,
    bytes: 118 * GB,
    progress: 3,
  },
  { filename: ARCANE, status: "downloaded", ageHours: 26, files: arcaneFiles, links: 9 },
  {
    filename: "Godzilla.Minus.One.2023.JAPANESE.1080p.BluRay.x264.DTS-HD.MA.5.1-FGT.mkv",
    status: "downloaded",
    ageHours: 30,
    bytes: 14.2 * GB,
    links: 1,
  },
  {
    filename: "Interstellar.2014.IMAX.1080p.BluRay.x264.DTS-HD.MA.5.1-SPARKS.mkv",
    status: "downloaded",
    ageHours: 40,
    bytes: 17.9 * GB,
    links: 1,
    hash: INTERSTELLAR_HASH,
  },
  {
    filename: "Old.Boy.2003.REMASTERED.1080p.BluRay.x264-DiAMOND",
    status: "dead",
    ageHours: 52,
    bytes: 9.4 * GB,
    progress: 0,
  },
  { filename: OKC, status: "downloaded", ageHours: 60, files: okcFiles, links: 1 },
  {
    filename: "Fallout.S01E01.The.End.2160p.AMZN.WEB-DL.DDP5.1.HDR.H.265-FLUX.mkv",
    status: "downloaded",
    ageHours: 75,
    bytes: 8.3 * GB,
    links: 1,
  },
  {
    filename: "Adobe.Photoshop.2024.v25.0.x64.Multilingual.Pre-Activated",
    status: "virus",
    ageHours: 90,
    bytes: 3.9 * GB,
    progress: 100,
  },
  {
    filename: "House.of.the.Dragon.S02E01.1080p.MAX.WEB-DL.DDP5.1.Atmos.H.264-FLUX.mkv",
    status: "downloaded",
    ageHours: 120,
    bytes: 4.7 * GB,
    links: 1,
  },
  {
    filename: "Civil.War.2024.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv",
    status: "downloaded",
    ageHours: 150,
    bytes: 6.4 * GB,
    links: 1,
  },
  { filename: "", status: "magnet_error", ageHours: 170, bytes: 0, progress: 0 },
  {
    filename: "Poor.Things.2023.1080p.BluRay.x264-SPRiNTER.mkv",
    status: "downloaded",
    ageHours: 200,
    bytes: 11.1 * GB,
    links: 1,
  },
  { filename: "blender-4.2.1-linux-x64.tar.xz", status: "downloaded", ageHours: 260, bytes: 341 * MB, links: 1 },
  {
    filename: "Interstellar.2014.IMAX.1080p.BluRay.x264.DTS-HD.MA.5.1-SPARKS.mkv",
    status: "downloaded",
    ageHours: 300,
    bytes: 17.9 * GB,
    links: 1,
    hash: INTERSTELLAR_HASH,
  },
  {
    filename: "The.Boys.S04E08.Assembling.an.Army.2160p.AMZN.WEB-DL.DDP5.1.HDR.H.265-NTb.mkv",
    status: "downloaded",
    ageHours: 380,
    bytes: 7.6 * GB,
    links: 1,
  },
  {
    filename: "Past.Lives.2023.1080p.WEB-DL.DDP5.1.H.264-EniaHD.mkv",
    status: "downloaded",
    ageHours: 500,
    bytes: 5.3 * GB,
    links: 1,
  },
  {
    filename: "The.Last.of.Us.S01E03.Long.Long.Time.2160p.HMAX.WEB-DL.DDP5.1.Atmos.DV.HDR.HEVC-CMRG.mkv",
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
  seasonPack: torrentInfos.find((t) => t.filename === SEVERANCE)!.id,
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
  ["Severance.S02E10.1080p.ATVP.WEB-DL.DDP5.1.H.264-NTb.mkv", "real-debrid.com", "video/x-matroska", 3.6 * GB, 3.2],
  ["Severance.S02E09.1080p.ATVP.WEB-DL.DDP5.1.H.264-NTb.mkv", "real-debrid.com", "video/x-matroska", 3.3 * GB, 3.2],
  [
    "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR.HEVC.TrueHD.Atmos.7.1-FGT.mkv",
    "real-debrid.com",
    "video/x-matroska",
    74.3 * GB,
    7.5,
  ],
  ["Proxmox-VE-8.2-ISO-Installer.iso", "1fichier.com", "application/x-iso9660-image", 1.34 * GB, 9],
  [
    "Arcane.S02E03.2160p.NF.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv",
    "real-debrid.com",
    "video/x-matroska",
    6.2 * GB,
    26,
  ],
  ["Lightroom_Presets_Pack_2024.zip", "rapidgator.net", "application/zip", 812 * MB, 29],
  [
    "Godzilla.Minus.One.2023.JAPANESE.1080p.BluRay.x264.DTS-HD.MA.5.1-FGT.mkv",
    "real-debrid.com",
    "video/x-matroska",
    14.2 * GB,
    31,
  ],
  [
    "Radiohead - OK Computer OKNOTOK 1997 2017 (2017) [FLAC 24-96].rar",
    "real-debrid.com",
    "application/x-rar-compressed",
    1.72 * GB,
    61,
  ],
  ["Kurzgesagt.Wallpapers.4K.part1.rar", "mega.nz", "application/x-rar-compressed", 2.1 * GB, 70],
  ["Kurzgesagt.Wallpapers.4K.part2.rar", "mega.nz", "application/x-rar-compressed", 1.4 * GB, 70.1],
  [
    "Fallout.S01E01.The.End.2160p.AMZN.WEB-DL.DDP5.1.HDR.H.265-FLUX.mkv",
    "real-debrid.com",
    "video/x-matroska",
    8.3 * GB,
    76,
  ],
  ["DaVinci_Resolve_Studio_19.0_Mac.dmg", "uptobox.com", "application/x-apple-diskimage", 3.4 * GB, 102],
  ["Civil.War.2024.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv", "real-debrid.com", "video/x-matroska", 6.4 * GB, 151],
  ["The_Art_of_Computer_Programming_Vol1-4.pdf", "1fichier.com", "application/pdf", 88 * MB, 240],
  ["Past.Lives.2023.1080p.WEB-DL.DDP5.1.H.264-EniaHD.mkv", "real-debrid.com", "video/x-matroska", 5.3 * GB, 501],
];

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
        return paged(route, filter === "active" ? activeTorrents : torrents, url);
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
