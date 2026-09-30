import {
  ArrowUpRightIcon,
  CreditCardIcon,
  DevicesIcon,
  GlobeHemisphereWestIcon,
  KeyIcon,
  LockKeyIcon,
  ReceiptIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Card, Group, Row } from "@/components/ui/group";
import { Progress, Skeleton } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";
import { daysLeft, formatBytes, formatDate, hostUsage } from "@/lib/format";
import { keys, useLibrary, useRdSettings, useTraffic, useTrafficDetails, useUser } from "@/lib/queries";
import { convertPoints, updateRdSetting } from "@/lib/rd/api";
import { signOut } from "@/lib/rd/auth";
import { errorMessage, RdError } from "@/lib/rd/errors";
import type { RdSettingName, RdSettings, TrafficDetails } from "@/lib/rd/types";

import { navigate } from "./router";
import { TokenDialog } from "./token-dialog";
import { Page } from "./toolbar";

const WEBSITE_LINKS = [
  { label: "Buy or extend premium", href: "https://real-debrid.com/premium", icon: CreditCardIcon },
  { label: "Devices and apps", href: "https://real-debrid.com/devices", icon: DevicesIcon },
  { label: "Password and 2FA", href: "https://real-debrid.com/account", icon: LockKeyIcon },
  { label: "Payment history", href: "https://real-debrid.com/payments-history", icon: ReceiptIcon },
  { label: "VPN and IP check", href: "https://real-debrid.com/vpn", icon: GlobeHemisphereWestIcon },
  { label: "Private API token", href: "https://real-debrid.com/apitoken", icon: KeyIcon },
];

export function AccountView(): ReactNode {
  const { data: user, isLoading } = useUser();
  const [settings] = useSettings();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [connecting, setConnecting] = useState(false);
  const range = useTrafficRange();
  const trafficLocked = needsToken(useTrafficDetails(range.start, range.end).error);
  const settingsLocked = needsToken(useRdSettings().error);

  if (isLoading || !user) {
    return (
      <Page title="Account" width="max-w-5xl">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="h-36 p-5">
              <Skeleton className="w-1/3" />
              <Skeleton className="mt-4 h-7 w-1/2" />
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  const days = daysLeft(user.premium);
  const premium = user.type === "premium";
  const convert = (): void =>
    setConfirm({
      title: `Convert ${user.points.toLocaleString()} points?`,
      description: "Real-Debrid turns fidelity points into premium days. This can't be undone.",
      action: "Convert",
      onConfirm: () => {
        convertPoints()
          .then(async () => {
            toast.success("Points converted to premium");
            await queryClient.invalidateQueries({ queryKey: keys.user });
          })
          .catch((error: unknown) =>
            toast.error(
              error instanceof RdError && error.status === 503 ? "Not enough points yet" : errorMessage(error),
            ),
          );
      },
    });

  return (
    <Page
      title={user.username}
      description={user.email}
      width="max-w-5xl"
      leading={<img src={user.avatar} alt="" className="size-14 rounded-full bg-fill shadow-panel" />}
      action={
        <Button
          variant="ghost"
          icon={<SignOutIcon />}
          onClick={() =>
            setConfirm({
              title: "Sign out?",
              description: "You can sign back in any time.",
              action: "Sign out",
              onConfirm: () => signOut().catch(console.error),
            })
          }
        >
          Sign out
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Premium"
          tone={premium && days > settings.expiryReminderDays ? undefined : "warning"}
          value={premium ? `${days} days` : "Inactive"}
          detail={premium ? `Until ${formatDate(user.expiration)}` : "Free account"}
          action={
            <Button size="sm" onClick={() => window.open("https://real-debrid.com/premium", "_blank")}>
              Extend
            </Button>
          }
        />
        <StatCard
          label="Fidelity points"
          value={user.points.toLocaleString()}
          detail="Convert them into premium days"
          action={
            <Button size="sm" disabled={!user.points} onClick={convert}>
              Convert
            </Button>
          }
        />
        <LibraryCard />
      </div>

      {(trafficLocked || settingsLocked) && (
        <TokenBanner
          missing={[trafficLocked && "traffic stats", settingsLocked && "Real-Debrid settings"]
            .filter(Boolean)
            .join(" and ")}
          onConnect={() => setConnecting(true)}
        />
      )}

      {!trafficLocked && <TrafficSection range={range} />}

      <div className={clsx("grid items-start gap-10 lg:gap-6", !settingsLocked && "lg:grid-cols-2")}>
        <HostLimits />
        {!settingsLocked && <RdSettingsSection />}
      </div>

      <section>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">On real-debrid.com</h2>
        <p className="mt-0.5 text-[13px] text-fg-3">Real-Debrid's API can't manage these, so they open the website.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEBSITE_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="press group flex items-center gap-3 rounded-[12px] bg-surface p-3 shadow-panel hover:bg-subtle dark:hover:bg-raised"
            >
              <span className="flex size-8 items-center justify-center rounded-[8px] bg-fill text-fg-2">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-[13px] font-medium">{label}</span>
              <ArrowUpRightIcon className="size-3.5 text-fg-4 transition-colors group-hover:text-fg-2" />
            </a>
          ))}
        </div>
      </section>
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
      <TokenDialog open={connecting} onOpenChange={setConnecting} />
    </Page>
  );
}

function StatCard({
  label,
  value,
  detail,
  action,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  action?: ReactNode;
  tone?: "warning";
}): ReactNode {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex h-7 items-center justify-between">
        <span className="text-[13px] font-medium text-fg-3">{label}</span>
        {action}
      </div>
      <div
        className={clsx(
          "tabular mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em]",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[13px] text-fg-3">{detail}</div>
    </Card>
  );
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function useTrafficRange(): { start: string; end: string } {
  return useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 86400_000);
    return { start: isoDay(start), end: isoDay(end) };
  }, []);
}

/** Browser (device-flow) sign-in gets permission denied on traffic and settings; a private token doesn't. */
function needsToken(error: unknown): boolean {
  return error instanceof RdError && (error.status === 403 || error.code === 9);
}

function LibraryCard(): ReactNode {
  const { torrents } = useLibrary();
  const bytes = torrents.reduce((sum, torrent) => sum + torrent.bytes, 0);
  return (
    <StatCard
      label="Library"
      value={formatBytes(bytes)}
      detail={`${torrents.length} torrent${torrents.length === 1 ? "" : "s"}`}
      action={
        <Button size="sm" onClick={() => navigate("/torrents")}>
          Open
        </Button>
      }
    />
  );
}

function TokenBanner({ missing, onConnect }: { missing: string; onConnect: () => void }): ReactNode {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
        <KeyIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-medium">Connect an API token to see {missing}</h2>
        <p className="mt-0.5 text-[13px] text-fg-3">
          Browser sign-in can't access these. Your private token can, and it never expires.
        </p>
      </div>
      <Button variant="primary" onClick={onConnect}>
        Connect token
      </Button>
    </Card>
  );
}

function TrafficSection({ range }: { range: { start: string; end: string } }): ReactNode {
  const details = useTrafficDetails(range.start, range.end);
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Traffic</h2>
        <p className="mt-0.5 text-[13px] text-fg-3">Daily downloads over the last 31 days</p>
      </div>
      <Card className="p-5">
        {details.data ? <TrafficChart details={details.data} start={range.start} /> : <div className="h-52" />}
      </Card>
    </section>
  );
}

function TrafficChart({ details, start }: { details: TrafficDetails; start: string }): ReactNode {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const first = new Date(`${start}T00:00:00Z`).getTime();
    return Array.from({ length: 31 }, (_, index) => {
      const day = isoDay(new Date(first + index * 86400_000));
      const entry = details[day];
      const topHost = entry ? Object.entries(entry.host).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
      return { day, bytes: entry?.bytes ?? 0, topHost };
    });
  }, [details, start]);
  const max = Math.max(1, ...days.map((d) => d.bytes));
  const total = days.reduce((sum, d) => sum + d.bytes, 0);
  const active = hover !== null ? days[hover] : undefined;
  const label = (day: string): string =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="tabular text-[22px] font-semibold tracking-[-0.02em]">
            {formatBytes(active?.bytes ?? total)}
          </div>
          <div className="mt-0.5 text-[13px] text-fg-3">
            {active ? `${label(active.day)}${active.topHost ? ` · mostly ${active.topHost}` : ""}` : "Total"}
          </div>
        </div>
        <span className="tabular text-[12px] text-fg-3">Peak {formatBytes(max)}</span>
      </div>
      <div className="relative h-40" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {days.map((d, index) => (
            <div key={d.day} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(index)}>
              <div
                className="w-full rounded-t-[3px] bg-chart transition-opacity duration-150"
                style={{
                  height: d.bytes ? `${Math.max(2, (d.bytes / max) * 100)}%` : 0,
                  opacity: hover === null || hover === index ? 1 : 0.35,
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-strong" />
      </div>
      <div className="tabular mt-2 flex justify-between text-[12px] text-fg-3">
        <span>{label(days[0]?.day ?? start)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function HostLimits(): ReactNode {
  const traffic = useTraffic();
  const limited = Object.entries(traffic.data ?? {}).filter(([, host]) => host.limit > 0);

  return (
    <Group title="Host limits" description="Hosters with a daily or monthly cap">
      {traffic.isLoading ? (
        <div className="p-4">
          <Skeleton className="w-2/3" />
        </div>
      ) : limited.length ? (
        limited.map(([host, info]) => {
          const usage = hostUsage(info);
          return (
            <div key={host} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px]">{host}</span>
                <span className="tabular shrink-0 text-[12px] text-fg-3">{usage.text}</span>
              </div>
              <Progress value={usage.used} tone={usage.used > 90 ? "danger" : "accent"} className="mt-2" />
              <div className="mt-1.5 text-[12px] text-fg-3">Resets {info.reset}</div>
            </div>
          );
        })
      ) : (
        <Row label="No limits on your hosters" />
      )}
    </Group>
  );
}

const SETTINGS: {
  name: RdSettingName;
  label: string;
  options: (s: RdSettings) => { value: string; label: string }[];
}[] = [
  {
    name: "streaming_quality",
    label: "Streaming quality",
    options: (s) => s.streaming_qualities.map((q) => ({ value: q, label: capitalize(q) })),
  },
  {
    name: "mobile_streaming_quality",
    label: "Mobile streaming quality",
    options: (s) => s.streaming_qualities.map((q) => ({ value: q, label: capitalize(q) })),
  },
  {
    name: "streaming_language_preference",
    label: "Preferred audio language",
    options: (s) => Object.entries(s.streaming_languages).map(([value, label]) => ({ value, label })),
  },
  {
    name: "download_port",
    label: "Download port",
    options: (s) => s.download_ports.map((p) => ({ value: p, label: capitalize(p) })),
  },
  {
    name: "locale",
    label: "Language",
    options: (s) => Object.entries(s.locales).map(([value, label]) => ({ value, label })),
  },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function RdSettingsSection(): ReactNode {
  const { data: settings, error } = useRdSettings();
  const queryClient = useQueryClient();

  if (error) {
    return (
      <Group title="Real-Debrid settings">
        <Row label="Couldn't load settings" description={errorMessage(error)} />
      </Group>
    );
  }
  if (!settings) return null;

  const current: Record<RdSettingName, string> = {
    streaming_quality: settings.streaming_quality,
    mobile_streaming_quality: settings.mobile_streaming_quality,
    streaming_language_preference: settings.streaming_language_preference,
    download_port: settings.download_port,
    locale: settings.locale,
    streaming_cast_audio_preference: settings.streaming_cast_audio_preference,
  };

  const save = (name: RdSettingName, value: string): void => {
    updateRdSetting(name, value)
      .then(async () => {
        toast.success("Saved");
        await queryClient.invalidateQueries({ queryKey: keys.rdSettings });
      })
      .catch((err: unknown) => toast.error(errorMessage(err)));
  };

  return (
    <Group title="Real-Debrid settings" description="Saved to your account, used everywhere">
      {SETTINGS.map((setting) => (
        <Row key={setting.name} label={setting.label} className="min-h-13 py-2">
          <Select
            label={setting.label}
            value={current[setting.name]}
            options={setting.options(settings)}
            onChange={(value) => save(setting.name, value)}
            className="w-40"
          />
        </Row>
      ))}
    </Group>
  );
}
