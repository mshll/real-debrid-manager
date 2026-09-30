import { ArrowUpRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { Button, Kbd } from "@/components/ui/button";
import { Group, Row } from "@/components/ui/group";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useStorageItem } from "@/hooks/use-storage";
import { disableIntercept, enableIntercept } from "@/lib/intercept";
import { canDownload } from "@/lib/outputs";
import { errorMessage } from "@/lib/rd/errors";
import { authItem, type FileSelection, type Player, type PrimaryAction } from "@/lib/storage";

import { API_TOKEN_URL, TokenDialog } from "./token-dialog";
import { Page } from "./toolbar";

const IS_SAFARI = import.meta.env.BROWSER === "safari";
const IS_CHROMIUM = import.meta.env.BROWSER === "chrome";

const RULE_DESCRIPTIONS: Record<FileSelection, string> = {
  video: "Starts on its own with the main videos. Skips samples, extras and junk.",
  all: "Starts on its own with every file.",
  largest: "Starts on its own with the single largest file.",
  ask: "You pick files for every torrent before it starts.",
};

export function SettingsView(): ReactNode {
  const [settings, update] = useSettings();

  const toggleIntercept = (on: boolean): void => {
    (on ? enableIntercept() : disableIntercept().then(() => true))
      .then((ok) => {
        if (ok) update({ interceptMagnets: on });
        else toast.error("Access to all sites is needed to catch magnet clicks");
      })
      .catch((error: unknown) => toast.error(errorMessage(error)));
  };

  return (
    <Page title="Settings" description="How the extension adds, captures and hands off your downloads.">
      <Group title="Adding torrents" description="What happens right after a magnet or .torrent is added">
        <Row label="Files to download" description={RULE_DESCRIPTIONS[settings.fileSelection]}>
          <Segmented<FileSelection>
            value={settings.fileSelection}
            onChange={(fileSelection) => update({ fileSelection })}
            className="w-80"
            options={[
              { value: "video", label: "Video" },
              { value: "all", label: "All" },
              { value: "largest", label: "Largest" },
              { value: "ask", label: "Ask" },
            ]}
          />
        </Row>
        <Row label="Skip duplicates" description="Don't add a torrent that's already in your library.">
          <Switch
            checked={settings.skipDuplicates}
            onChange={(skipDuplicates) => update({ skipDuplicates })}
            label="Skip duplicates"
          />
        </Row>
        <Row
          label="Auto-start torrents added elsewhere"
          description="Also select files for torrents added from Stremio, DMM or the website."
        >
          <Switch
            checked={settings.autoStartExternal}
            onChange={(autoStartExternal) => update({ autoStartExternal })}
            label="Auto-start external"
          />
        </Row>
        <Row
          label="Only keep cached torrents"
          description="Checks if Real-Debrid already has it. If not, the torrent is removed instead of queued. Uses an active slot for a moment."
        >
          <Switch checked={settings.onlyCached} onChange={(onlyCached) => update({ onlyCached })} label="Only cached" />
        </Row>
      </Group>

      <Group
        title="Capturing links"
        description="Ways to send links to Real-Debrid from any page"
        footer={
          IS_SAFARI ? undefined : (
            <>
              Tip: type <b className="font-semibold text-fg-2">rd</b> and a space in the address bar to add from there.
            </>
          )
        }
      >
        <Row
          label="Catch magnet links on every site"
          description="Clicking a magnet sends it to Real-Debrid instead of a torrent app. Hold ⌥ to open it normally."
        >
          <Switch checked={settings.interceptMagnets} onChange={toggleIntercept} label="Catch magnets" />
        </Row>
        <Row label="Find links when the popup opens" description="Lists every magnet and supported link on the page.">
          <Switch
            checked={settings.scanOnOpen}
            onChange={(scanOnOpen) => update({ scanOnOpen })}
            label="Scan on open"
          />
        </Row>
        {IS_CHROMIUM && (
          <Row
            label="Keyboard shortcuts"
            onClick={() => browser.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(console.error)}
          >
            <span className="flex items-center gap-3 text-[12px] text-fg-3">
              <span className="flex items-center gap-1">
                <Kbd>⌥</Kbd>
                <Kbd>⇧</Kbd>
                <Kbd>R</Kbd> popup
              </span>
              <span className="flex items-center gap-1">
                <Kbd>⌥</Kbd>
                <Kbd>⇧</Kbd>
                <Kbd>S</Kbd> scan
              </span>
            </span>
            <ArrowUpRightIcon className="size-3.5 text-fg-3" />
          </Row>
        )}
      </Group>

      <Group title="Downloads and playback" description="What to do with a file once Real-Debrid has it">
        <Row label="Main action" description="Used by double-click and by links sent from the right-click menu.">
          <Select<PrimaryAction>
            label="Main action"
            value={settings.primaryAction}
            onChange={(primaryAction) => update({ primaryAction })}
            className="w-44"
            options={[
              { value: "download", label: canDownload() ? "Download" : "Open link" },
              { value: "stream", label: "Stream" },
              { value: "copy", label: "Copy link" },
            ]}
          />
        </Row>
        <Row label="Play videos in">
          <Select<Player>
            label="Player"
            value={settings.player}
            onChange={(player) => update({ player })}
            className="w-44"
            options={[
              { value: "browser", label: "Browser" },
              { value: "iina", label: "IINA" },
              { value: "vlc", label: "VLC" },
              { value: "infuse", label: "Infuse" },
            ]}
          />
        </Row>
      </Group>

      {!IS_SAFARI && (
        <Group title="Notifications" description="Desktop alerts and the toolbar badge">
          <Row label="When a torrent is ready">
            <Switch
              checked={settings.notifyComplete}
              onChange={(notifyComplete) => update({ notifyComplete })}
              label="Notify complete"
            />
          </Row>
          <Row label="When a torrent fails">
            <Switch
              checked={settings.notifyErrors}
              onChange={(notifyErrors) => update({ notifyErrors })}
              label="Notify errors"
            />
          </Row>
          <Row label="Remind me before premium ends">
            <Select
              label="Reminder"
              value={String(settings.expiryReminderDays)}
              onChange={(value) => update({ expiryReminderDays: Number(value) })}
              className="w-44"
              options={[
                { value: "0", label: "Never" },
                { value: "3", label: "3 days before" },
                { value: "7", label: "7 days before" },
                { value: "14", label: "14 days before" },
              ]}
            />
          </Row>
          <Row label="Show active count on the icon">
            <Switch checked={settings.showBadge} onChange={(showBadge) => update({ showBadge })} label="Badge" />
          </Row>
        </Group>
      )}

      <Group title="Appearance">
        <Row label="Theme">
          <Segmented
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            className="w-60"
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Row>
      </Group>

      <ConnectionGroup />

      <p className="text-center text-[12px] text-fg-4">Real-Debrid Manager {browser.runtime.getManifest().version}</p>
    </Page>
  );
}

function ConnectionGroup(): ReactNode {
  const auth = useStorageItem(authItem);
  const [connecting, setConnecting] = useState(false);

  return (
    <Group title="Connection" description="How this browser signs in to Real-Debrid">
      <Row label="Signed in with">
        <span className="flex items-center gap-1.5 text-[13px] text-fg-2">
          <CheckCircleIcon weight="fill" className="size-4 text-accent" />
          {auth?.kind === "token" ? "API token" : "Browser sign-in"}
        </span>
      </Row>
      {auth?.kind !== "token" && (
        <Row
          label="API token"
          description={
            <>
              Unlocks traffic stats and Real-Debrid settings, and never expires. Get it at{" "}
              <a
                href={API_TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-fg-2 underline decoration-border-strong underline-offset-2 hover:text-fg"
              >
                real-debrid.com/apitoken
              </a>
              .
            </>
          }
        >
          <Button size="sm" onClick={() => setConnecting(true)}>
            Connect token
          </Button>
        </Row>
      )}
      <TokenDialog open={connecting} onOpenChange={setConnecting} />
    </Group>
  );
}
