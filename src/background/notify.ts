import { browser } from "wxt/browser";

import { managerUrl } from "@/lib/pages";

export async function openManager(route = ""): Promise<void> {
  const url = managerUrl(route);
  const [existing] = await browser.tabs.query({ url: browser.runtime.getURL("/manager.html") });
  if (existing?.id !== undefined) {
    await browser.tabs.update(existing.id, { active: true, url });
    if (existing.windowId !== undefined) await browser.windows.update(existing.windowId, { focused: true });
    return;
  }
  await browser.tabs.create({ url });
}

/** Safari has no notifications API; callers fall back to the badge. */
export async function notify(id: string, title: string, message: string): Promise<boolean> {
  if (!browser.notifications) return false;
  await browser.notifications.create(id, {
    type: "basic",
    iconUrl: browser.runtime.getManifest().icons?.["128"] ?? "",
    title,
    message,
  });
  return true;
}

export async function handleNotificationClick(id: string): Promise<void> {
  const [kind, value] = id.split(":");
  if (kind === "expiry") await browser.tabs.create({ url: "https://real-debrid.com/premium" });
  else if (kind === "torrent" && value) await openManager(`/torrents/${value}`);
  else await openManager();
  await browser.notifications?.clear(id);
}
