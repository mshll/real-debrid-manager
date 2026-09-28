import { ArrowUpRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Group, Row } from "@/components/ui/group";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useStorageItem } from "@/hooks/use-storage";
import { disableIntercept, enableIntercept } from "@/lib/intercept";
import { canDownload, requestAria2Access, testAria2 } from "@/lib/outputs";
import { signInWithToken } from "@/lib/rd/auth";
import { errorMessage } from "@/lib/rd/errors";
import { authItem, type FileSelection, type Player, type PrimaryAction } from "@/lib/storage";

import { Toolbar } from "./toolbar";

const IS_SAFARI = import.meta.env.BROWSER === "safari";
const IS_CHROMIUM = import.meta.env.BROWSER === "chrome";

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
    <section className="flex min-w-0 flex-1 flex-col">
      <Toolbar title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-grouped">
        <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-7">
          <Group
            title="Adding torrents"
            footer={
              settings.fileSelection === "ask"
                ? "You'll pick files for every torrent before it starts."
                : "Torrents start on their own. Video keeps the main files and skips samples, extras and junk."
            }
          >
            <Row label="Files to download">
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
            <Row label="Skip torrents already in your library">
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
              <Switch
                checked={settings.onlyCached}
                onChange={(onlyCached) => update({ onlyCached })}
                label="Only cached"
              />
            </Row>
          </Group>

          <Group
            title="Capturing links"
            footer={
              <>
                Type <b>rd</b> and a space in the address bar to add from there.
              </>
            }
          >
            <Row
              label="Catch magnet links on every site"
              description="Clicking a magnet sends it to Real-Debrid instead of a torrent app. Hold ⌥ to open it normally."
            >
              <Switch checked={settings.interceptMagnets} onChange={toggleIntercept} label="Catch magnets" />
            </Row>
            <Row label="Find links when the popup opens">
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
                <span className="text-[12px]">⌥⇧R popup · ⌥⇧S scan</span>
                <ArrowUpRight className="size-3.5 text-fg-3" />
              </Row>
            )}
          </Group>

          <Group title="When a download is ready">
            <Row label="Main action" description="Used by row buttons and links sent from the right-click menu.">
              <Select<PrimaryAction>
                label="Main action"
                value={settings.primaryAction}
                onChange={(primaryAction) => update({ primaryAction })}
                className="w-40"
                options={[
                  { value: "download", label: canDownload() ? "Download" : "Open link" },
                  { value: "stream", label: "Stream" },
                  { value: "copy", label: "Copy link" },
                  { value: "aria2", label: "Send to aria2" },
                ]}
              />
            </Row>
            <Row label="Play videos in">
              <Select<Player>
                label="Player"
                value={settings.player}
                onChange={(player) => update({ player })}
                className="w-40"
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
            <Group title="Notifications">
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
                  className="w-40"
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

          <Aria2Group />

          <Group title="Appearance">
            <Row label="Theme">
              <Segmented
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                className="w-56"
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </Row>
          </Group>

          <ConnectionGroup />

          <p className="text-center text-[11.5px] text-fg-3">
            Real-Debrid Manager {browser.runtime.getManifest().version}
          </p>
        </div>
      </div>
    </section>
  );
}

function Aria2Group(): ReactNode {
  const [settings, update] = useSettings();
  const [draft, setDraft] = useState(settings.aria2);
  const [testing, setTesting] = useState(false);

  const test = async (): Promise<void> => {
    setTesting(true);
    try {
      if (!(await requestAria2Access(draft))) throw new Error("Permission to reach aria2 was denied");
      const version = await testAria2(draft);
      update({ aria2: draft });
      toast.success(`Connected to aria2 ${version}`);
    } catch (error) {
      toast.error(`Couldn't reach aria2: ${errorMessage(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Group title="aria2 / Motrix" footer="Motrix listens on http://localhost:16800/jsonrpc by default.">
      <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-2 px-3.5 py-3">
        <label className="text-[13px]" htmlFor="aria2-url">
          RPC URL
        </label>
        <Input id="aria2-url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
        <label className="text-[13px]" htmlFor="aria2-secret">
          Secret
        </label>
        <Input
          id="aria2-secret"
          type="password"
          value={draft.secret}
          onChange={(event) => setDraft({ ...draft, secret: event.target.value })}
          placeholder="Optional"
        />
        <label className="text-[13px]" htmlFor="aria2-dir">
          Folder
        </label>
        <Input
          id="aria2-dir"
          value={draft.dir}
          onChange={(event) => setDraft({ ...draft, dir: event.target.value })}
          placeholder="aria2 default"
        />
      </div>
      <div className="flex justify-end px-3.5 py-2.5">
        <Button size="sm" disabled={testing} onClick={() => test().catch(console.error)}>
          {testing ? "Testing" : "Save and test"}
        </Button>
      </div>
    </Group>
  );
}

function ConnectionGroup(): ReactNode {
  const auth = useStorageItem(authItem);
  const [token, setToken] = useState("");

  const save = (): void => {
    signInWithToken(token.trim())
      .then(() => {
        setToken("");
        toast.success("Now using your API token");
      })
      .catch((error: unknown) => toast.error(errorMessage(error)));
  };

  return (
    <Group
      title="Connection"
      footer="Browser sign-in may not have access to traffic stats or Real-Debrid settings. A private API token covers everything and never expires."
    >
      <Row label="Signed in with">
        <span className="text-[12.5px]">{auth?.kind === "token" ? "API token" : "Browser sign-in"}</span>
      </Row>
      {auth?.kind !== "token" && (
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <Input
            type="password"
            placeholder="Paste private API token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <Button size="sm" disabled={!token.trim()} onClick={save}>
            Use token
          </Button>
          <a
            href="https://real-debrid.com/apitoken"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[12px] text-accent hover:underline"
          >
            Get token
          </a>
        </div>
      )}
    </Group>
  );
}
