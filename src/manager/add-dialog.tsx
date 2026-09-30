import { useState, type ReactNode } from "react";

import { Composer } from "@/components/composer";
import { FilePicker } from "@/components/file-picker";
import { mergeOutcomes, OutcomeList } from "@/components/outcome-list";
import { Dialog } from "@/components/ui/dialog";
import type { AddOutcome } from "@/lib/add";

export function AddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactNode {
  const [outcomes, setOutcomes] = useState<AddOutcome[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setOutcomes([]);
        }}
        title="Add to Real-Debrid"
        description="Magnets, info hashes, hoster links, folders or .torrent files. Paste as many as you like."
        className="max-w-xl"
      >
        <div className="flex flex-col gap-2 pb-2">
          <Composer onResult={(next) => setOutcomes((previous) => mergeOutcomes(previous, next))} />
          {outcomes.length > 0 && (
            <OutcomeList outcomes={outcomes} onChooseFiles={setPicking} onClear={() => setOutcomes([])} />
          )}
        </div>
      </Dialog>
      <FilePicker torrentId={picking} onClose={() => setPicking(null)} />
    </>
  );
}
