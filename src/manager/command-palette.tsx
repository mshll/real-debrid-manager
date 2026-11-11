import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  DesktopIcon,
  DownloadSimpleIcon,
  GearSixIcon,
  MagnetStraightIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { Command } from "cmdk";
import type { ReactNode } from "react";

import { StatusIcon } from "@/components/status-icon";
import { Kbd } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { STATUS } from "@/lib/format";
import { useLibrary } from "@/lib/queries";

import { navigate } from "./router";

const ITEM =
  "flex h-10 items-center gap-3 rounded-[8px] px-3 text-[14px] text-fg data-[selected=true]:bg-fill-strong [&_svg]:size-4 [&_svg]:shrink-0 [&>svg]:text-fg-3";
const GROUP =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-3";

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
  const [, update] = useSettings();
  const go = (action: () => void): void => {
    onOpenChange(false);
    action();
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50" />
        <BaseDialog.Popup className="fixed top-[14vh] left-1/2 z-50 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-[12px] bg-raised shadow-popover outline-none">
          <BaseDialog.Title className="sr-only">Search</BaseDialog.Title>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <MagnifyingGlassIcon className="size-[18px] shrink-0 text-fg-3" />
              <Command.Input
                autoFocus
                placeholder="Search torrents or jump to…"
                className="h-13 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-3"
              />
            </div>
            <Command.List className="scroll-fade max-h-[400px] scroll-py-2 overflow-y-auto px-2 pb-2">
              <Command.Empty className="px-3 py-10 text-center text-[13px] text-fg-3">No results</Command.Empty>
              <Command.Group heading="Actions" className={GROUP}>
                <Command.Item className={ITEM} onSelect={() => go(onAdd)}>
                  <PlusIcon /> <span className="flex-1">Add magnets or links</span>
                  <Kbd>N</Kbd>
                </Command.Item>
                <Command.Item
                  className={ITEM}
                  value="theme light"
                  onSelect={() => go(() => update({ theme: "light" }))}
                >
                  <SunIcon /> Light theme
                </Command.Item>
                <Command.Item className={ITEM} value="theme dark" onSelect={() => go(() => update({ theme: "dark" }))}>
                  <MoonIcon /> Dark theme
                </Command.Item>
                <Command.Item
                  className={ITEM}
                  value="theme system"
                  onSelect={() => go(() => update({ theme: "system" }))}
                >
                  <DesktopIcon /> System theme
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Go to" className={GROUP}>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/torrents"))}>
                  <MagnetStraightIcon /> Torrents
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/downloads"))}>
                  <DownloadSimpleIcon /> Downloads
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/account"))}>
                  <UserCircleIcon /> Account
                </Command.Item>
                <Command.Item className={ITEM} onSelect={() => go(() => navigate("/settings"))}>
                  <GearSixIcon /> Settings
                </Command.Item>
              </Command.Group>
              {torrents.length > 0 && (
                <Command.Group heading="Torrents" className={GROUP}>
                  {torrents.slice(0, 500).map((torrent) => (
                    <Command.Item
                      key={torrent.id}
                      value={`${torrent.filename} ${torrent.id}`}
                      className={ITEM}
                      onSelect={() => go(() => navigate(`/torrents/${torrent.id}`))}
                    >
                      <StatusIcon status={torrent.status} progress={torrent.progress} />
                      <span className="min-w-0 flex-1 truncate">{torrent.filename}</span>
                      <span className="text-[12px] text-fg-3">{STATUS[torrent.status].label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[12px] text-fg-3">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>⏎</Kbd> Open
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>Esc</Kbd> Close
              </span>
            </div>
          </Command>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
