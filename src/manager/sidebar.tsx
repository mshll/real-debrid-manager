import clsx from "clsx";
import { CircleUser, Download, Magnet, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { daysLeft, isActive } from "@/lib/format";
import { useLibrary, useUser } from "@/lib/queries";

import { navigate } from "./router";

const ITEMS = [
  { id: "torrents", label: "Torrents", icon: Magnet },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "account", label: "Account", icon: CircleUser },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type Section = (typeof ITEMS)[number]["id"];

export function Sidebar({ section, onSearch }: { section: Section; onSearch: () => void }): ReactNode {
  const { data: user } = useUser();
  const { torrents } = useLibrary();
  const active = torrents.filter((t) => isActive(t.status)).length;

  return (
    <aside className="hairline-r flex w-[216px] shrink-0 flex-col bg-sidebar px-2.5 pt-4 pb-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-2 pb-4">
        <Logo className="size-6" />
        <span className="text-[14px] font-semibold tracking-[-0.01em]">Real-Debrid</span>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="mb-3 flex h-7 items-center gap-2 rounded-[7px] bg-fill px-2 text-[12.5px] text-fg-3 hover:text-fg-2"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-auto font-sans text-[11px]">⌘K</kbd>
      </button>

      <nav className="flex flex-col gap-px">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(`/${id}`)}
            className={clsx(
              "flex h-7 items-center gap-2.5 rounded-[7px] px-2 text-[13px] transition-colors",
              section === id ? "bg-fill-strong font-medium text-fg" : "text-fg-2 hover:bg-fill hover:text-fg",
            )}
          >
            <Icon className={clsx("size-4", section === id ? "text-accent" : "text-fg-3")} />
            {label}
            {id === "torrents" && active > 0 && (
              <span className="tabular ml-auto text-[11.5px] text-fg-3">{active}</span>
            )}
          </button>
        ))}
      </nav>

      {user && (
        <button
          type="button"
          onClick={() => navigate("/account")}
          className="mt-auto flex items-center gap-2.5 rounded-[8px] p-2 text-left hover:bg-fill"
        >
          <img src={user.avatar} alt="" className="size-7 rounded-full bg-fill" />
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium">{user.username}</span>
            <span className="tabular block text-[11.5px] text-fg-3">
              {user.type === "premium" ? `Premium · ${daysLeft(user.premium)} days` : "Free"}
            </span>
          </span>
        </button>
      )}
    </aside>
  );
}
