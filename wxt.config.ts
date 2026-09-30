import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  autoIcons: { developmentIndicator: "overlay" },
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser }) => ({
    name: "Real-Debrid Manager",
    description: "Capture links, manage torrents, and run your Real-Debrid account from the browser",
    permissions: [
      "storage",
      "alarms",
      "contextMenus",
      "activeTab",
      "scripting",
      ...(browser === "safari" ? [] : ["notifications", "downloads"]),
    ],
    ...(browser !== "safari" && { optional_permissions: ["clipboardRead"] }),
    host_permissions: ["https://real-debrid.com/*", "https://*.real-debrid.com/*"],
    optional_host_permissions: ["<all_urls>"],
    action: { default_title: "Real-Debrid" },
    ...(browser !== "safari" && { omnibox: { keyword: "rd" } }),
    commands: {
      _execute_action: {
        suggested_key: { default: "Alt+Shift+R" },
      },
      "scan-page": {
        suggested_key: { default: "Alt+Shift+S" },
        description: "Scan page for links",
      },
      ...(browser === "chrome" && {
        "open-side-panel": {
          suggested_key: { default: "Alt+Shift+P" },
          description: "Open the side panel",
        },
      }),
    },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "real-debrid@meshal",
          strict_min_version: "128.0",
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
  }),
});
