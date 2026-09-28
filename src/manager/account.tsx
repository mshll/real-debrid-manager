import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Group, Row } from "@/components/ui/group";
import { Spinner } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { daysLeft, formatBytes, formatDate } from "@/lib/format";
import { keys, useRdSettings, useTraffic, useTrafficDetails, useUser } from "@/lib/queries";
import { convertPoints, updateRdSetting } from "@/lib/rd/api";
import { signOut } from "@/lib/rd/auth";
import { errorMessage, RdError } from "@/lib/rd/errors";
import type { RdSettingName, TrafficDetails } from "@/lib/rd/types";

import { Toolbar } from "./toolbar";

const WEBSITE_LINKS = [
  { label: "Buy or extend premium", href: "https://real-debrid.com/premium" },
  { label: "Devices and connected apps", href: "https://real-debrid.com/devices" },
  { label: "Password and two-factor", href: "https://real-debrid.com/account" },
  { label: "Payment history", href: "https://real-debrid.com/payments-history" },
  { label: "VPN and IP check", href: "https://real-debrid.com/vpn" },
  { label: "Private API token", href: "https://real-debrid.com/apitoken" },
];

export function AccountView(): ReactNode {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  if (isLoading || !user) {
    return (
      <section className="flex flex-1 items-center justify-center text-fg-3">
        <Spinner />
      </section>
    );
  }

  const days = daysLeft(user.premium);
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
    <section className="flex min-w-0 flex-1 flex-col">
      <Toolbar title="Account" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-grouped">
        <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-7">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt="" className="size-14 rounded-full bg-fill" />
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{user.username}</h2>
              <p className="text-[12.5px] text-fg-2">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Premium"
              value={user.type === "premium" ? `${days} days` : "Inactive"}
              detail={user.type === "premium" ? `Until ${formatDate(user.expiration)}` : "Free account"}
              action={
                <a
                  href="https://real-debrid.com/premium"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-medium text-accent hover:underline"
                >
                  Extend
                </a>
              }
            />
            <Stat
              label="Fidelity points"
              value={user.points.toLocaleString()}
              detail="Earned with every purchase"
              action={
                <button type="button" onClick={convert} className="text-[12px] font-medium text-accent hover:underline">
                  Convert
                </button>
              }
            />
          </div>

          <TrafficSection />
          <RdSettingsSection />

          <Group
            title="On real-debrid.com"
            footer="These aren't available through Real-Debrid's API, so they open the website."
          >
            {WEBSITE_LINKS.map((link) => (
              <Row key={link.href} label={link.label} onClick={() => window.open(link.href, "_blank")}>
                <ArrowUpRight className="size-3.5 text-fg-3" />
              </Row>
            ))}
          </Group>

          <div>
            <Button
              variant="danger"
              icon={<LogOut className="size-3.5" />}
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
          </div>
        </div>
      </div>
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
  action,
}: {
  label: string;
  value: string;
  detail: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="rounded-[12px] bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-fg-2">{label}</span>
        {action}
      </div>
      <div className="tabular mt-1.5 text-[24px] font-semibold tracking-[-0.02em]">{value}</div>
      <div className="text-[12px] text-fg-3">{detail}</div>
    </div>
  );
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function TrafficSection(): ReactNode {
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 86400_000);
    return { start: isoDay(start), end: isoDay(end) };
  }, []);
  const details = useTrafficDetails(range.start, range.end);
  const traffic = useTraffic();

  if (details.error instanceof RdError && (details.error.status === 403 || details.error.code === 9)) {
    return (
      <Group title="Traffic" footer="Sign in with a private API token in Settings to see traffic stats.">
        <Row label="Not available with browser sign-in" />
      </Group>
    );
  }

  const limited = Object.entries(traffic.data ?? {}).filter(([, host]) => host.limit > 0);

  return (
    <Group title="Traffic · last 31 days">
      <div className="p-4">
        {details.data ? <TrafficChart details={details.data} start={range.start} /> : <div className="h-36" />}
      </div>
      {limited.map(([host, info]) => (
        <Row key={host} label={host} description={`Resets ${info.reset}`}>
          <span className="tabular text-[12px]">
            {info.type === "links"
              ? `${info.left} of ${info.limit} links left`
              : `${formatBytes(info.left)} of ${formatBytes(info.limit)} left`}
          </span>
        </Row>
      ))}
    </Group>
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

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="tabular text-[20px] font-semibold tracking-[-0.02em]">
            {formatBytes(active?.bytes ?? total)}
          </div>
          <div className="text-[12px] text-fg-3">
            {active
              ? `${new Date(`${active.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}${active.topHost ? ` · mostly ${active.topHost}` : ""}`
              : "Total downloaded"}
          </div>
        </div>
        <span className="tabular text-[11px] text-fg-3">peak {formatBytes(max)}</span>
      </div>
      <div className="relative h-28" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-0 h-px bg-separator" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-separator" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d, index) => (
            <div key={d.day} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(index)}>
              <div
                className="w-full rounded-t-[3px] bg-chart transition-opacity"
                style={{
                  height: d.bytes ? `${Math.max(2, (d.bytes / max) * 100)}%` : 0,
                  opacity: hover === null || hover === index ? 1 : 0.35,
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-fg-3/40" />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-fg-3">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const SETTING_LABELS: {
  name: RdSettingName;
  label: string;
  options: (s: NonNullable<ReturnType<typeof useRdSettings>["data"]>) => { value: string; label: string }[];
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
      <Group title="Real-Debrid settings" footer="Sign in with a private API token in Settings to change these.">
        <Row label="Not available with browser sign-in" />
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
    <Group title="Real-Debrid settings">
      {SETTING_LABELS.map((setting) => (
        <Row key={setting.name} label={setting.label}>
          <Select
            label={setting.label}
            value={current[setting.name]}
            options={setting.options(settings)}
            onChange={(value) => save(setting.name, value)}
            className="w-44"
          />
        </Row>
      ))}
    </Group>
  );
}
