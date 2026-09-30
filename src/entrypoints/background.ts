import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { captureAndReport, createMenus, handleMenuClick } from "@/background/capture";
import { resumeLogin, startLogin } from "@/background/login";
import { handleNotificationClick } from "@/background/notify";
import { checkExpiry, DAILY_ALARM, sync, SYNC_ALARM } from "@/background/sync";
import { addLinks, startUploadedTorrent } from "@/lib/add";
import { getHostMatchers } from "@/lib/hosts";
import { registerIntercept } from "@/lib/intercept";
import { extractLinks } from "@/lib/links";
import { onMessage } from "@/lib/messaging";
import { authItem, getSettings } from "@/lib/storage";

// Every listener is registered synchronously on worker start so the browser
// can wake the worker for a context-menu click without the popup being opened.
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    run("setup", async () => {
      await createMenus();
      await ensureDailyAlarm();
      if ((await getSettings()).interceptMagnets) await registerIntercept();
      await sync();
    });
  });

  browser.runtime.onStartup.addListener(() => {
    run("startup", async () => {
      await createMenus();
      await ensureDailyAlarm();
      if ((await getSettings()).interceptMagnets) await registerIntercept();
      await sync();
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    run("menu", () => handleMenuClick(info, tab?.id));
  });

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === "scan-page") run("command", () => browser.action.openPopup());
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

  onMessage("addLinks", async ({ data }) => {
    const outcomes = await addLinks(data.links, data.options);
    await sync();
    return outcomes;
  });
  onMessage("capture", ({ data, sender }) => captureAndReport(data.links, sender.tab?.id));
  onMessage("startUploadedTorrent", async ({ data }) => {
    const outcome = await startUploadedTorrent(data.id, data.name);
    await sync();
    return outcome;
  });
  onMessage("startLogin", () => startLogin());
  onMessage("resumeLogin", () => resumeLogin());
  onMessage("sync", () => sync());
});

/** Alarms may not survive a browser restart. */
async function ensureDailyAlarm(): Promise<void> {
  if (!(await browser.alarms.get(DAILY_ALARM))) {
    await browser.alarms.create(DAILY_ALARM, { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  }
}

function run(label: string, task: () => Promise<unknown>): void {
  task().catch((error: unknown) => console.error(`[${label}]`, error));
}
