import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/progress";
import { signInWithToken } from "@/lib/rd/auth";
import { errorMessage } from "@/lib/rd/errors";

export const API_TOKEN_URL = "https://real-debrid.com/apitoken";

export function TokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const connect = async (): Promise<void> => {
    setBusy(true);
    try {
      await signInWithToken(token.trim());
      await queryClient.invalidateQueries();
      setToken("");
      onOpenChange(false);
      toast.success("API token connected");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Connect an API token"
      description="Browser sign-in can't read traffic stats or change Real-Debrid settings. Your private API token can, and it never expires."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!token.trim() || busy} onClick={() => connect().catch(console.error)}>
            {busy ? <Spinner className="size-3.5" /> : "Connect"}
          </Button>
        </>
      }
    >
      <ol className="flex flex-col gap-4 text-[13px]">
        <li className="flex gap-3">
          <Step n={1} />
          <div className="flex-1">
            <p className="text-fg">Copy your token from Real-Debrid</p>
            <Button
              size="sm"
              className="mt-2"
              icon={<ArrowUpRightIcon />}
              onClick={() => window.open(API_TOKEN_URL, "_blank")}
            >
              Open real-debrid.com/apitoken
            </Button>
          </div>
        </li>
        <li className="flex gap-3">
          <Step n={2} />
          <form
            className="flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (token.trim()) connect().catch(console.error);
            }}
          >
            <label htmlFor="api-token" className="text-fg">
              Paste it here
            </label>
            <Input
              id="api-token"
              type="password"
              autoComplete="off"
              placeholder="Private API token"
              className="mt-2 w-full"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </form>
        </li>
      </ol>
    </Dialog>
  );
}

function Step({ n }: { n: number }): ReactNode {
  return (
    <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-fill text-[12px] font-semibold text-fg-2">
      {n}
    </span>
  );
}
