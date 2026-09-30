import { ArrowSquareOutIcon, CopyIcon, KeyIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useStorageItem } from "@/hooks/use-storage";
import { sendMessage } from "@/lib/messaging";
import { signInWithToken } from "@/lib/rd/auth";
import { errorMessage } from "@/lib/rd/errors";
import { loginStateItem } from "@/lib/storage";

import { Button, IconButton } from "./ui/button";
import { Input } from "./ui/field";
import { Spinner } from "./ui/progress";
import { Logo } from "./logo";

export function SignIn(): ReactNode {
  const login = useStorageItem(loginStateItem);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenMode, setTokenMode] = useState(false);
  const [token, setToken] = useState("");

  const waiting = login && !login.error && login.expiresAt > Date.now();

  useEffect(() => {
    if (waiting) sendMessage("resumeLogin").catch(console.error);
  }, [waiting]);

  const start = async (): Promise<void> => {
    setError(null);
    setStarting(true);
    try {
      await sendMessage("startLogin");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const saveToken = async (): Promise<void> => {
    setError(null);
    setStarting(true);
    try {
      await signInWithToken(token.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center px-8 pt-10 pb-5 text-center">
      <div className="my-auto flex w-full flex-col items-center">
        <Logo className="size-12" />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">Real-Debrid Manager</h1>
        <p className="mt-1.5 max-w-72 text-[13px] leading-relaxed text-fg-3">
          Add magnets and links from any page, and manage your torrents and account.
        </p>

        <div className="mt-8 w-full max-w-76">
          {waiting ? (
            <div className="rounded-[12px] bg-surface p-4 text-left shadow-panel">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <Spinner className="size-3.5 text-accent" /> Waiting for approval
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-3">
                Approve in the tab that opened, or enter this code at real-debrid.com/device.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-[8px] bg-fill py-1.5 pr-1.5 pl-3">
                <span className="flex-1 font-mono text-[18px] font-semibold tracking-[0.2em]">{login.userCode}</span>
                <IconButton
                  label="Copy code"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(login.userCode)
                      .then(() => toast.success("Code copied"), console.error)
                  }
                >
                  <CopyIcon />
                </IconButton>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  icon={<ArrowSquareOutIcon />}
                  onClick={() => window.open(login.verificationUrl, "_blank")}
                >
                  Open page
                </Button>
                <Button size="sm" variant="ghost" onClick={() => loginStateItem.setValue(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : tokenMode ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveToken().catch(console.error);
              }}
            >
              <Input
                autoFocus
                type="password"
                placeholder="Private API token"
                className="h-10"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
              <Button variant="primary" size="lg" type="submit" disabled={!token.trim() || starting}>
                {starting ? <Spinner /> : "Sign in"}
              </Button>
              <a
                className="mt-1 text-[12px] text-fg-3 hover:text-fg"
                href="https://real-debrid.com/apitoken"
                target="_blank"
                rel="noreferrer"
              >
                Find your token on real-debrid.com
              </a>
            </form>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => start().catch(console.error)}
              disabled={starting}
            >
              {starting ? <Spinner /> : "Continue with Real-Debrid"}
            </Button>
          )}

          {(error ?? login?.error) && <p className="mt-3 text-[12px] text-danger">{error ?? login?.error}</p>}

          {!waiting && (
            <>
              <div className="my-5 flex items-center gap-3 text-[12px] text-fg-4">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="ghost"
                className="w-full"
                icon={tokenMode ? undefined : <KeyIcon />}
                onClick={() => {
                  setTokenMode(!tokenMode);
                  setError(null);
                }}
              >
                {tokenMode ? "Sign in with your browser instead" : "Use an API token"}
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="pt-8 text-[11px] text-fg-4">Your sign-in stays in this browser.</p>
    </div>
  );
}
