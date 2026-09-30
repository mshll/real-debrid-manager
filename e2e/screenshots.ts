import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import type { browser } from "@wxt-dev/browser";
import { chromium, type BrowserContext, type Page, type Route, type Worker } from "playwright";

import { FAILED_STATUSES, failedCount, handleRd, ids, torrents, type MockLog } from "./fixtures";

declare const chrome: typeof browser;

type Theme = "light" | "dark";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXTENSION = path.join(ROOT, ".output/chrome-mv3");
const OUT = path.join(ROOT, "e2e/screenshots");
const MANAGER = { width: 1280, height: 800 };
const POPUP_WIDTH = 400;

const STATUS_LABELS: Record<string, string> = {
  magnet_error: "Magnet error",
  error: "Error",
  virus: "Virus detected",
  dead: "Dead",
};

interface Problem {
  source: string;
  kind: "console.error" | "console.warning" | "pageerror";
  text: string;
}

const problems: Problem[] = [];
const external: string[] = [];
const shots: string[] = [];
const checks: { name: string; ok: boolean; detail: string }[] = [];
const log: MockLog = { handled: [], unmocked: [] };

function watch(target: Page | Worker, source: string): void {
  target.on("console", (message) => {
    const type = message.type();
    if (type !== "error" && type !== "warning") return;
    // Playwright also relays service-worker console messages to every page listener.
    if (message.worker() && message.worker() !== target) return;
    if (source.includes("browser sign-in") && /status of 403/.test(message.text())) return;
    const location = message.location();
    const where = location.url
      ? ` (${location.url.replace(/^chrome-extension:\/\/[^/]+/, "")}:${location.lineNumber})`
      : "";
    problems.push({
      source,
      kind: type === "error" ? "console.error" : "console.warning",
      text: message.text() + where,
    });
  });
}

async function launch(): Promise<{ context: BrowserContext; worker: Worker; extensionId: string }> {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    viewport: MANAGER,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      // Anything that slips past routing fails to resolve instead of reaching the real API with a fake token.
      "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost",
    ],
  });
  await context.route("https://api.real-debrid.com/**", handleRd(log));
  await context.route(
    (url) => /^https?:$/.test(url.protocol) && url.hostname !== "api.real-debrid.com",
    (route) => {
      external.push(route.request().url());
      return route.abort("blockedbyclient");
    },
  );
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  watch(worker, "service-worker");
  context.on("serviceworker", (next) => watch(next, "service-worker (restarted)"));
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId };
}

async function setStorage(worker: Worker, area: "local" | "sync", values: Record<string, unknown>): Promise<void> {
  await worker.evaluate(({ area, values }) => chrome.storage[area].set(values), { area, values });
}

async function removeStorage(worker: Worker, area: "local" | "sync", key: string): Promise<void> {
  await worker.evaluate(({ area, key }) => chrome.storage[area].remove(key), { area, key });
}

async function open(
  context: BrowserContext,
  url: string,
  label: string,
  theme: Theme,
  init?: () => void,
): Promise<Page> {
  const page = await context.newPage();
  if (init) await page.addInitScript(init);
  watch(page, label);
  page.on("pageerror", (error) =>
    problems.push({ source: label, kind: "pageerror", text: error.stack ?? error.message }),
  );
  await page.goto(url);
  await page.locator(`html[data-theme="${theme}"]`).waitFor();
  return page;
}

/** The popup tab has no scannable page behind it, so the scan sees a fake one. */
function fakePageScan(): void {
  const hrefs = [
    "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1",
    "magnet:?xt=urn:btih:89abcdef0123456789abcdef0123456789abcdef&dn=The.Last.of.Us.S02.1080p.WEB-DL",
    "https://1fichier.com/?k9x2m4p7q1&af=1",
    "https://1fichier.com/?b3v8n1z5c6",
    "https://rapidgator.net/?file/4f2a9c/Arcane.S02E01.mkv.html",
  ];
  // Object.assign sidesteps the full Tab and InjectionResult shapes the stubs don't need.
  Object.assign(chrome.tabs, { query: async () => [{ id: 1, url: "https://example.com/" }] });
  Object.assign(chrome.scripting, { executeScript: async () => [{ result: { hrefs, text: "" } }] });
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, animations: "disabled" });
  shots.push(path.relative(ROOT, file));
}

async function shootPopup(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: POPUP_WIDTH, height: 1000 });
  const height = await page.evaluate(() =>
    Math.ceil(document.getElementById("root")?.firstElementChild?.getBoundingClientRect().height ?? 600),
  );
  await page.setViewportSize({ width: POPUP_WIDTH, height });
  await shoot(page, name);
}

async function check(name: string, run: () => Promise<string>): Promise<void> {
  try {
    checks.push({ name, ok: true, detail: await run() });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      detail: error instanceof Error ? (error.message.split("\n")[0] ?? "") : String(error),
    });
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function waitForLibrary(page: Page): Promise<void> {
  await page.getByRole("row").nth(15).waitFor();
  await page.getByText("Premium ·").waitFor();
}

async function signedOutShots(context: BrowserContext, worker: Worker, base: string): Promise<void> {
  for (const theme of ["light", "dark"] as const) {
    await setStorage(worker, "sync", { settings: { theme } });
    const page = await open(context, `${base}/popup.html`, `popup signed-out ${theme}`, theme);
    await page.getByRole("heading", { name: "Real-Debrid Manager" }).waitFor();
    await shootPopup(page, `popup-signed-out-${theme}`);
    await page.close();
  }
}

async function signedInShots(context: BrowserContext, worker: Worker, base: string, theme: Theme): Promise<void> {
  await setStorage(worker, "sync", { settings: { theme } });
  const manager = `${base}/manager.html`;

  const popup = await open(context, `${base}/popup.html`, `popup ${theme}`, theme);
  await popup.getByText("days left").waitFor();
  await popup.getByText(torrents[0]!.filename).waitFor();
  await popup.getByText("Scanning page").waitFor({ state: "detached" });
  await shootPopup(popup, `popup-${theme}`);
  await popup.close();

  const scanned = await open(context, `${base}/popup.html`, `popup page links ${theme}`, theme, fakePageScan);
  await scanned.getByText("On this page").waitFor();
  await scanned.getByText("Add all").waitFor();
  await scanned.getByText(torrents[0]!.filename).waitFor();
  await shootPopup(scanned, `popup-page-links-${theme}`);
  if (theme === "light") {
    await check("scroll fades follow the scroll position", async () => {
      const fades = (): Promise<string> =>
        scanned.evaluate(async () => {
          const list = document.querySelector("section .scroll-fade");
          if (!list) return "missing";
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const style = getComputedStyle(list);
          return `${style.getPropertyValue("--fade-start")}/${style.getPropertyValue("--fade-end")}`;
        });
      const top = await fades();
      await scanned.evaluate(() =>
        document.querySelector("section .scroll-fade")?.scrollTo({ top: 1e4, behavior: "instant" }),
      );
      const bottom = await fades();
      assert(
        top.startsWith("0px/") && !top.endsWith("/0px") && bottom.endsWith("/0px") && !bottom.startsWith("0px/"),
        `start/end fades: top ${top}, bottom ${bottom}`,
      );
      return `top ${top}, scrolled to end ${bottom}`;
    });
  }
  if (theme === "light") {
    await check("adding links one by one keeps every result", async () => {
      await scanned.getByRole("button", { name: "1fichier.com/?b3v8n1z5c6" }).click();
      await scanned.getByText("Link ready").waitFor();
      await scanned.getByRole("button", { name: "1fichier.com/?k9x2m4p7q1&af=1" }).click();
      await scanned.getByText("2 links ready").waitFor();
      const ready = await scanned.getByText("Link ready").count();
      assert(ready === 2, `expected 2 ready results, got ${ready}`);
      await scanned.getByRole("button", { name: "Download all" }).waitFor();
      await shootPopup(scanned, "popup-outcomes-light");
      return "2 results listed with Copy all and Download all";
    });
  }
  await scanned.close();

  const list = await open(context, `${manager}#/torrents`, `manager torrents ${theme}`, theme);
  await waitForLibrary(list);
  await shoot(list, `manager-torrents-${theme}`);
  await list.setViewportSize({ width: 2400, height: 1000 });
  await shoot(list, `manager-torrents-wide-${theme}`);
  await list.setViewportSize(MANAGER);

  await list.getByRole("button", { name: "Choose files" }).click();
  await list.getByRole("button", { name: "Start download" }).waitFor();
  await shoot(list, `manager-file-picker-${theme}`);
  await list.keyboard.press("Escape");
  await list.getByRole("button", { name: "Start download" }).waitFor({ state: "detached" });

  await list.keyboard.press("n");
  await list.getByPlaceholder("Paste magnets, hashes or hoster links").waitFor();
  await shoot(list, `manager-add-dialog-${theme}`);
  await list.keyboard.press("Escape");
  await list.getByPlaceholder("Paste magnets, hashes or hoster links").waitFor({ state: "detached" });

  await list.keyboard.press("ControlOrMeta+k");
  await list.getByPlaceholder("Search torrents or jump to…").waitFor();
  await shoot(list, `manager-command-palette-${theme}`);
  await list.close();

  const detail = await open(context, `${manager}#/torrents/${ids.seasonPack}`, `manager detail ${theme}`, theme);
  await waitForLibrary(detail);
  await detail.getByText("Severance.S02E01.1080p", { exact: false }).first().waitFor();
  await shoot(detail, `manager-torrent-detail-${theme}`);
  await detail.close();

  const downloads = await open(context, `${manager}#/downloads`, `manager downloads ${theme}`, theme);
  await downloads.getByText("Proxmox-VE-8.2-ISO-Installer.iso").waitFor();
  await shoot(downloads, `manager-downloads-${theme}`);
  await downloads.close();

  const account = await open(context, `${manager}#/account`, `manager account ${theme}`, theme);
  await account.getByText("Daily downloads over the last 31 days").waitFor();
  await account.getByText("Peak ").waitFor();
  await account.getByText("Streaming quality", { exact: true }).waitFor();
  await account.getByText("rapidgator.net").waitFor();
  await shoot(account, `manager-account-${theme}`);
  await account.close();

  const denied = (route: Route): Promise<void> =>
    route.fulfill({ status: 403, json: { error: "permission_denied", error_code: 9 } });
  await context.route(/\/rest\/1\.0\/(traffic\/details|settings)/, denied);
  const locked = await open(context, `${manager}#/account`, `manager account browser sign-in ${theme}`, theme);
  await locked.getByRole("button", { name: "Connect token" }).waitFor();
  await locked.getByText("ddownload.com").waitFor();
  await shoot(locked, `manager-account-browser-sign-in-${theme}`);
  await locked.getByRole("button", { name: "Connect token" }).click();
  await locked.getByRole("dialog", { name: "Connect an API token" }).waitFor();
  await shoot(locked, `manager-token-dialog-${theme}`);
  await locked.close();
  await context.unroute(/\/rest\/1\.0\/(traffic\/details|settings)/, denied);

  const settings = await open(context, `${manager}#/settings`, `manager settings ${theme}`, theme);
  await settings.getByText("Adding torrents").waitFor();
  await shoot(settings, `manager-settings-${theme}`);
  await settings.close();
}

async function smokeChecks(context: BrowserContext, worker: Worker, base: string): Promise<void> {
  await setStorage(worker, "sync", { settings: { theme: "light" } });
  const page = await open(context, `${base}/manager.html#/torrents`, "smoke", "light");
  await waitForLibrary(page);
  const rows = page.getByRole("row");

  await check("selecting two rows shows the selection bar", async () => {
    const boxes = page.getByRole("checkbox", { name: "Select", exact: true });
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await page.getByText("2 selected").waitFor({ timeout: 3000 });
    const checked = await page.locator('[role="row"][aria-selected="true"]').count();
    assert(checked === 2, `expected 2 selected rows, got ${checked}`);
    await shoot(page, "smoke-selection-bar-light");
    await page.getByRole("button", { name: "Clear selection" }).click();
    await page.getByText("2 selected").waitFor({ state: "detached", timeout: 3000 });
    return "bar reads '2 selected', 2 rows aria-selected, clear button removes it";
  });

  await check("ready torrents get quick actions even when the list has no links", async () => {
    const row = rows.filter({ hasText: "Severance.S02.1080p" });
    await row.getByRole("button", { name: "Download" }).waitFor({ timeout: 3000 });
    await row.getByRole("checkbox", { name: "Select", exact: true }).click();
    const bar = page.getByRole("button", { name: "Download", exact: true }).last();
    assert(await bar.isEnabled(), "selection bar Download is disabled for a ready torrent");
    const before = log.handled.length;
    await bar.click();
    const deadline = Date.now() + 3000;
    while (!log.handled.slice(before).some((entry) => entry.path.startsWith("/torrents/info/"))) {
      assert(Date.now() < deadline, "Download didn't fetch links from torrent info");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await page.getByRole("button", { name: "Clear selection" }).click();
    return "row shows Download; selection bar Download enabled and fetches links from /torrents/info";
  });

  await check("search filters the list", async () => {
    const search = page.getByPlaceholder("Search torrents");
    await search.fill("interstellar");
    await page.waitForFunction(() => document.querySelectorAll('[role="row"]').length === 2, null, { timeout: 3000 });
    const names = await rows.allInnerTexts();
    assert(
      names.every((text) => text.toLowerCase().includes("interstellar")),
      `unexpected rows: ${names.join(" | ")}`,
    );
    await search.fill("severance");
    await page.waitForFunction(() => document.querySelectorAll('[role="row"]').length === 1, null, { timeout: 3000 });
    await page.getByText(`1 of ${torrents.length}`).waitFor({ timeout: 3000 });
    await search.fill("");
    await page.waitForFunction((n) => document.querySelectorAll('[role="row"]').length >= n, 15, { timeout: 3000 });
    return `'interstellar' -> 2 rows, 'severance' -> 1 row ('1 of ${torrents.length}'), cleared -> full list`;
  });

  await check("Failed filter shows only failed torrents", async () => {
    await page.getByRole("radio", { name: /^Failed/ }).click();
    await page.waitForFunction((n) => document.querySelectorAll('[role="row"]').length === n, failedCount, {
      timeout: 3000,
    });
    const texts = await rows.allInnerTexts();
    const labels = FAILED_STATUSES.map((status) => STATUS_LABELS[status]!);
    const bad = texts.filter((text) => !labels.some((label) => text.includes(label)));
    assert(bad.length === 0, `non-failed rows shown: ${bad.join(" | ")}`);
    await shoot(page, "smoke-failed-filter-light");
    return `${texts.length} rows, all with a failed status label`;
  });

  await page.close();
}

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const { context, worker, extensionId } = await launch();
  const base = `chrome-extension://${extensionId}`;
  let failed = false;

  try {
    await removeStorage(worker, "local", "auth");
    await signedOutShots(context, worker, base);

    const handledBefore = log.handled.length;
    await setStorage(worker, "local", { auth: { kind: "token", accessToken: "test" } });
    await check("service worker requests are intercepted by the mock", async () => {
      const deadline = Date.now() + 10_000;
      while (!log.handled.slice(handledBefore).some((entry) => entry.fromServiceWorker)) {
        assert(Date.now() < deadline, "no Real-Debrid request from the service worker reached the mock within 10s");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      const badge = await worker.evaluate(() => chrome.action.getBadgeText({}));
      const active = torrents.filter((t) => !["downloaded", ...FAILED_STATUSES].includes(t.status)).length;
      assert(badge === String(active), `badge '${badge}', expected '${active}' from mocked sync`);
      const swPaths = log.handled.filter((entry) => entry.fromServiceWorker).map((entry) => entry.path);
      return `SW hit mock: ${[...new Set(swPaths)].join(", ")}; badge '${badge}'`;
    });

    await check("console capture works for pages and the service worker", async () => {
      const probe = await context.newPage();
      watch(probe, "probe");
      await probe.goto(`${base}/popup.html`);
      await probe.evaluate(() => console.error("e2e-probe"));
      await worker.evaluate(() => console.error("e2e-probe"));
      await probe.close();
      await new Promise((resolve) => setTimeout(resolve, 200));
      const hits = problems.filter((p) => p.text.startsWith("e2e-probe"));
      problems.splice(0, problems.length, ...problems.filter((p) => !p.text.startsWith("e2e-probe")));
      const sources = hits.map((p) => p.source).sort();
      assert(sources.join() === "probe,service-worker", `captured from: ${sources.join() || "nothing"}`);
      return "probe errors captured from page and service worker";
    });

    for (const theme of ["light", "dark"] as const) await signedInShots(context, worker, base, theme);
    await smokeChecks(context, worker, base);

    const auth = await worker.evaluate(() => chrome.storage.local.get("auth"));
    await check("auth survived the run", async () => {
      assert(Boolean(auth.auth), "auth was cleared during the run");
      return "chrome.storage.local.auth still set";
    });
  } catch (error) {
    failed = true;
    console.error(error);
  } finally {
    await context.close();
  }

  report();
  const smokeFailed = checks.some((c) => !c.ok);
  if (failed || smokeFailed || log.unmocked.length) process.exit(1);
}

function report(): void {
  const section = (title: string): void => console.log(`\n== ${title}`);
  section(`Screenshots (${shots.length})`);
  for (const shot of shots) console.log(`  ${shot}`);

  section("Checks");
  for (const c of checks) console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}: ${c.detail}`);

  section(
    `Mocked Real-Debrid requests (${log.handled.length}, ${log.handled.filter((e) => e.fromServiceWorker).length} from service worker)`,
  );
  const counts = new Map<string, number>();
  for (const entry of log.handled) {
    const key = `${entry.method} ${entry.path.split("?")[0]!.replace(/\/[A-Z0-9]{13}$/, "/:id")}${entry.fromServiceWorker ? " [sw]" : ""}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...counts].sort()) console.log(`  ${String(count).padStart(4)}  ${key}`);

  section(`Unmocked Real-Debrid requests (${log.unmocked.length})`);
  for (const url of new Set(log.unmocked)) console.log(`  ${url}`);

  section(`Blocked external requests (${external.length})`);
  for (const url of new Set(external)) console.log(`  ${url}`);

  section(`Console and page errors (${problems.length})`);
  const grouped = new Map<string, string[]>();
  for (const p of problems) {
    const key = `${p.kind}: ${p.text}`;
    grouped.set(key, [...(grouped.get(key) ?? []), p.source]);
  }
  for (const [key, sources] of grouped) console.log(`  ${key}\n      from: ${[...new Set(sources)].join(", ")}`);
}

await main();
