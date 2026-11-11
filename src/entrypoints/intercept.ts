import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import { describeOutcomes } from "@/lib/outcome";
import { classify } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";

// Unlisted so it adds no host permission; lib/intercept.ts registers it once the user opts in.
export default defineUnlistedScript(() => {
  document.addEventListener(
    "click",
    (event) => {
      if (event.altKey || event.button !== 0) return;
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="magnet:"]') : null;
      const link = anchor ? classify(anchor.href, null) : null;
      if (!link) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast("Sending to Real-Debrid…");
      sendMessage("capture", { links: [link] })
        .then((outcomes) => showToast(describeOutcomes(outcomes).title))
        .catch((error: unknown) => showToast(`Couldn't send: ${String(error)}`));
    },
    true,
  );
});

let host: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Plain styles in a shadow root so the page's CSS can't reach it. */
function showToast(text: string): void {
  if (!host) {
    host = document.createElement("rd-toast");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      div { position: fixed; bottom: 20px; left: 50%; z-index: 2147483647; transform: translateX(-50%);
        padding: 10px 16px; border-radius: 12px; background: rgba(30,30,32,0.92); color: #f5f5f7;
        font: 500 13px -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
        box-shadow: 0 10px 30px -6px rgba(0,0,0,0.4); backdrop-filter: blur(20px);
        transition: opacity 200ms ease, translate 200ms cubic-bezier(0.23,1,0.32,1); }
      div.hidden { opacity: 0; translate: 0 8px; }
    </style><div class="hidden"></div>`;
    document.documentElement.append(host);
  }
  const box = host.shadowRoot?.querySelector("div");
  if (!box) return;
  box.textContent = text;
  requestAnimationFrame(() => box.classList.remove("hidden"));
  clearTimeout(timer);
  timer = setTimeout(() => box.classList.add("hidden"), 3000);
}
