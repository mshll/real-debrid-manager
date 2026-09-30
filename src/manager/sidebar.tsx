import {
  DownloadSimpleIcon,
  GearSixIcon,
  MagnetStraightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { IconButton, Kbd } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { daysLeft, isActive } from "@/lib/format";
import { useLibrary, useUser } from "@/lib/queries";

import { navigate } from "./router";

const ITEMS = [
  { id: "torrents", label: "Torrents", icon: MagnetStraightIcon },
  { id: "downloads", label: "Downloads", icon: DownloadSimpleIcon },
  { id: "account", label: "Account", icon: UserCircleIcon },
  { id: "settings", label: "Settings", icon: GearSixIcon },
] as const;

export type Section = (typeof ITEMS)[number]["id"];

export function Sidebar({
  section,
  onSearch,
  onAdd,
}: {
  section: Section;
  onSearch: () => void;
  onAdd: () => void;
}): ReactNode {
  const { data: user } = useUser();
  const [settings] = useSettings();
  const { torrents } = useLibrary();
  const active = torrents.filter((t) => isActive(t.status)).length;
  const days = user ? daysLeft(user.premium) : 0;

  return (
    <aside className="flex w-60 shrink-0 flex-col px-3 pt-3 pb-3">
      <div className="flex h-10 items-center gap-2.5 pr-0.5 pl-2">
        <Logo className="size-6" />
        <span className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">Real-Debrid</span>
        <IconButton
          label="Add torrents or links"
          shortcut="N"
          onClick={onAdd}
          className="bg-surface text-fg-2! shadow-panel hover:bg-subtle dark:hover:bg-raised"
        >
          <PlusIcon />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="press mt-3 flex h-8 items-center gap-2 rounded-[8px] px-2 text-[13px] text-fg-3 hover:bg-fill hover:text-fg-2"
      >
        <MagnifyingGlassIcon className="size-4" />
        Search
        <span className="ml-auto flex gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav className="mt-2 flex flex-col gap-0.5">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const on = section === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => navigate(`/${id}`)}
              className={clsx(
                "press flex h-8 items-center gap-2.5 rounded-[8px] px-2 text-[13px] font-medium",
                on ? "bg-fill-strong text-fg" : "text-fg-2 hover:bg-fill hover:text-fg",
              )}
            >
              <Icon className={clsx("size-4", on ? "text-fg" : "text-fg-3")} weight={on ? "fill" : "bold"} />
              {label}
              {id === "torrents" && active > 0 && (
                <span className="tabular ml-auto flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-info-soft px-1.5 text-[11px] font-semibold text-info">
                  {active}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto">
          {user.type === "premium" && days <= settings.expiryReminderDays && (
            <a
              href="https://real-debrid.com/premium"
              target="_blank"
              rel="noreferrer"
              className="mb-2 block rounded-[10px] bg-warning-soft p-3 text-[12px] text-warning hover:brightness-105"
            >
              <span className="block font-semibold">Premium ends in {days} days</span>
              <span className="text-warning/80">Extend on real-debrid.com</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => navigate("/account")}
            className="press flex w-full items-center gap-2.5 rounded-[8px] p-2 text-left hover:bg-fill"
          >
            <img src={user.avatar} alt="" className="size-7 rounded-full bg-fill" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{user.username}</span>
              <span className="tabular block truncate text-[12px] text-fg-3">
                {user.type === "premium" ? `Premium · ${days} days` : "Free account"}
              </span>
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
