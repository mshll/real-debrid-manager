import { ArrowRight, KeyRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useStorageItem } from "@/hooks/use-storage";
import { sendMessage } from "@/lib/messaging";
import { signInWithToken } from "@/lib/rd/auth";
import { errorMessage } from "@/lib/rd/errors";
import { loginStateItem } from "@/lib/storage";

import { Button } from "./ui/button";
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
    <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <Logo className="size-14" />
      <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.01em]">Real-Debrid Manager</h1>
      <p className="mt-1.5 max-w-64 text-[13px] text-fg-2">
        Capture links, manage torrents and your account without the clunky site.
      </p>

      <div className="mt-7 w-full max-w-72">
        {tokenMode ? (
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
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <Button variant="primary" size="lg" type="submit" disabled={!token.trim() || starting}>
              {starting ? <Spinner /> : "Sign in"}
            </Button>
            <a
              className="text-[12px] text-accent hover:underline"
              href="https://real-debrid.com/apitoken"
              target="_blank"
              rel="noreferrer"
            >
              Find your token
            </a>
          </form>
        ) : waiting ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-fg-2">
              <Spinner className="text-accent" /> Waiting for approval
            </div>
            <p className="text-[12px] text-fg-2">
              Approve in the tab that opened, or enter this code at{" "}
              <a className="text-accent hover:underline" href={login.verificationUrl} target="_blank" rel="noreferrer">
                real-debrid.com/device
              </a>
            </p>
            <div className="rounded-[10px] bg-fill px-4 py-2 font-mono text-[20px] font-semibold tracking-[0.18em]">
              {login.userCode}
            </div>
            <Button variant="ghost" size="sm" onClick={() => loginStateItem.setValue(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => start().catch(console.error)}
            disabled={starting}
          >
            {starting ? (
              <Spinner />
            ) : (
              <>
                Sign in with Real-Debrid <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        )}

        {(error ?? login?.error) && <p className="mt-3 text-[12px] text-danger">{error ?? login?.error}</p>}

        {!waiting && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-fg-2 hover:text-fg"
            onClick={() => {
              setTokenMode(!tokenMode);
              setError(null);
            }}
          >
            <KeyRound className="size-3.5" />
            {tokenMode ? "Sign in with your browser instead" : "Use an API token"}
          </button>
        )}
      </div>
    </div>
  );
}
