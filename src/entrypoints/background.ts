import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { captureAndReport, createMenus, handleMenuClick } from "@/background/capture";
import { resumeLogin, startLogin } from "@/background/login";
import { handleNotificationClick } from "@/background/notify";
import { checkExpiry, DAILY_ALARM, sync, SYNC_ALARM } from "@/background/sync";
import { addLinks, addUploadedTorrent, type AddOutcome } from "@/lib/add";
import { getHostMatchers } from "@/lib/hosts";
import { reconcileIntercept } from "@/lib/intercept";
import { migrateLegacyAuth } from "@/lib/legacy";
import { extractLinks } from "@/lib/links";
import { onMessage } from "@/lib/messaging";
import { reinsertTorrent } from "@/lib/reinsert";
import { authItem, getSettings, settingsItem } from "@/lib/storage";
import { fromBase64 } from "@/lib/upload";

// Every listener is registered synchronously on worker start so the browser
// can wake the worker for a context-menu click without the popup being opened.
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(setUp);
  browser.runtime.onStartup.addListener(setUp);

  browser.contextMenus.onClicked.addListener((info, tab) => {
    run("menu", () => handleMenuClick(info, tab?.id));
  });

  browser.commands.onCommand.addListener((command, tab) => {
    // sidePanel.open must run inside the shortcut's user gesture, before any await.
    if (command === "open-side-panel" && tab?.windowId !== undefined) {
      browser.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
    }
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) run("sync", sync);
    if (alarm.name === DAILY_ALARM) {
      run("daily", async () => {
        await checkExpiry();
        await getHostMatchers();
      });
    }
  });

  browser.notifications?.onClicked.addListener((id) => run("notification", () => handleNotificationClick(id)));

  // Safari has no omnibox API.
  if (browser.omnibox) {
    browser.omnibox.setDefaultSuggestion({ description: "Send magnet, hash or link to Real-Debrid" });
    browser.omnibox.onInputEntered.addListener((text) => {
      run("omnibox", async () => {
        const links = extractLinks(text, await getHostMatchers(), { bareHashes: true });
        if (links.length) await captureAndReport(links);
      });
    });
  }

  authItem.watch(() => run("auth", sync));
  settingsItem.watch((next, previous) => {
    if (next.interceptMagnets === previous.interceptMagnets) return;
    run("intercept", async () => reconcileIntercept((await getSettings()).interceptMagnets));
  });

  onMessage("addLinks", async ({ data }) => {
    const outcomes = await addLinks(data.links, data.options);
    await sync().catch((error: unknown) => console.error("[sync]", error));
    return outcomes;
  });
  onMessage("capture", ({ data, sender }) => captureAndReport(data.links, sender.tab?.id));
  onMessage("uploadTorrents", async ({ data }) => {
    const outcomes: AddOutcome[] = [];
    for (const file of data.files)
      outcomes.push(await addUploadedTorrent(file.name, new Blob([fromBase64(file.data)])));
    await sync().catch((error: unknown) => console.error("[sync]", error));
    return outcomes;
  });
  onMessage("reinsert", async ({ data }) => {
    const id = await reinsertTorrent(data);
    await sync().catch((error: unknown) => console.error("[sync]", error));
    return id;
  });
  onMessage("startLogin", () => startLogin());
  onMessage("resumeLogin", () => resumeLogin());
  onMessage("sync", () => sync());
});

/** Each step runs on its own so one failing (say, a menu context Safari rejects) can't block the rest. */
function setUp(): void {
  run("legacy auth", migrateLegacyAuth);
  run("menus", createMenus);
  run("alarm", ensureDailyAlarm);
  run("intercept", async () => reconcileIntercept((await getSettings()).interceptMagnets));
  run("sync", sync);
}

/** Alarms may not survive a browser restart. */
async function ensureDailyAlarm(): Promise<void> {
  if (!(await browser.alarms.get(DAILY_ALARM))) {
    await browser.alarms.create(DAILY_ALARM, { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  }
}

function run(label: string, task: () => Promise<unknown>): void {
  task().catch((error: unknown) => console.error(`[${label}]`, error));
}
