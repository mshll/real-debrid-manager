import { defineExtensionMessaging } from "@webext-core/messaging";

import type { AddOptions, AddOutcome } from "./add";
import type { ParsedLink } from "./links";

interface Protocol {
  addLinks(data: { links: ParsedLink[]; options?: AddOptions }): AddOutcome[];
  /** Adds from a page with no extension UI open; reports via notification. */
  capture(data: { links: ParsedLink[] }): AddOutcome[];
  /** Each `data` is a .torrent file in base64; runtime messages only carry JSON. */
  uploadTorrents(data: { files: { name: string; data: string }[] }): AddOutcome[];
  /** Resolves to the new torrent id. */
  reinsert(data: { id: string; hash: string }): string;
  startLogin(): void;
  resumeLogin(): void;
  sync(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<Protocol>();
