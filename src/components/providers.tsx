import { IconContext } from "@phosphor-icons/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { useThemeSync } from "@/hooks/use-theme";
import { useLibraryStampSync } from "@/lib/queries";
import { RdError } from "@/lib/rd/errors";

import { TooltipProvider } from "./ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => !(error instanceof RdError && error.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

const ICONS = { weight: "bold", mirrored: false } as const;

export function bootstrapTheme(): void {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function Sync(): null {
  useThemeSync();
  useLibraryStampSync();
  return null;
}

export function Providers({
  children,
  toastPosition = "bottom-center",
}: {
  children: ReactNode;
  toastPosition?: "bottom-center" | "bottom-right";
}): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <IconContext.Provider value={ICONS}>
        <TooltipProvider>
          <Sync />
          {children}
          <Toaster
            position={toastPosition}
            gap={8}
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "flex w-full items-start gap-3 rounded-[10px] bg-raised px-4 py-3 text-[13px] text-fg shadow-popover [&_[data-icon]]:mt-0.5",
                title: "font-medium",
                description: "mt-0.5 text-[12px] text-fg-2 break-words",
                actionButton:
                  "ml-auto shrink-0 rounded-[6px] bg-fill-strong px-2.5 py-1 text-[12px] font-medium text-fg",
                success: "[&_[data-icon]]:text-accent",
                error: "[&_[data-icon]]:text-danger",
                loading: "[&_[data-icon]]:text-fg-3",
              },
            }}
          />
        </TooltipProvider>
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
