import { defineExtensionMessaging } from "@webext-core/messaging";

import type { AddOptions, AddOutcome } from "./add";
import type { ParsedLink } from "./links";

interface Protocol {
  addLinks(data: { links: ParsedLink[]; options?: AddOptions }): AddOutcome[];
  /** Adds from a page with no extension UI open; reports via notification. */
  capture(data: { links: ParsedLink[] }): AddOutcome[];
  startUploadedTorrent(data: { id: string; name: string }): AddOutcome;
  startLogin(): void;
  resumeLogin(): void;
  sync(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<Protocol>();
