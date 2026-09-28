import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Command } from "cmdk";
import { CircleUser, Download, Magnet, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";
import { STATUS } from "@/lib/format";
import { useLibrary } from "@/lib/queries";

import { navigate } from "./router";

const ITEM =
  "flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-fg data-[selected=true]:bg-accent data-[selected=true]:text-accent-fg [&_svg]:size-4 [&_svg]:shrink-0";

/** No open animation: it is summoned by keyboard many times a day. */
export function CommandPalette({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}): ReactNode {
  const { torrents } = useLibrary();
  const go = (action: () => void): void => {
    onOpenChange(false);
    action();
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" />
        <BaseDialog.Popup className="fixed top-[14vh] left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-[14px] bg-bg shadow-popover outline-none">
          <BaseDialog.Title className="sr-only">Search</BaseDialog.Title>
          <Command loop className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder="Search torrents or jump to…"
              className="hairline-b h-12 bg-transparent px-4 text-[15px] outline-none placeholder:text-fg-3"
            />
            <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-fg-3">No results</Command.Empty>
              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:text-fg-3"
              >
                <Command.Item className={ITEM} onSelect={() => go(onAdd)}>
                  <Plus /> Add magnets or links
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/torrents"))}>
                  <Magnet /> Torrents
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/downloads"))}>
                  <Download /> Downloads
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/account"))}>
                  <CircleUser /> Account
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/settings"))}>
                  <Settings /> Settings
                </Command.Item>
              </Command.Group>
              {torrents.length > 0 && (
                <Command.Group
                  heading="Torrents"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:text-fg-3"
                >
                  {torrents.slice(0, 500).map((torrent) => (
                    <Command.Item
                      key={torrent.id}
                      value={`${torrent.filename} ${torrent.id}`}
                      className={ITEM}
                      onSelect={() => go(() => navigate(`/torrents/${torrent.id}`))}
                    >
                      <FileIcon name={torrent.filename} className="[[data-selected=true]_&]:text-accent-fg" />
                      <span className="min-w-0 flex-1 truncate">{torrent.filename}</span>
                      <span className="text-[11.5px] opacity-60">{STATUS[torrent.status].label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
