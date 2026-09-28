import { browser } from "wxt/browser";

export function managerUrl(route = ""): string {
  return browser.runtime.getURL("/manager.html") + (route ? `#${route}` : "");
}
