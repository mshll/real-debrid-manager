import type { ReactNode } from "react";

import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

export interface ConfirmRequest {
  title: string;
  description?: string;
  action: string;
  onConfirm: () => void;
}

export function Confirm({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }): ReactNode {
  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => !open && onClose()}
      title={request?.title}
      description={request?.description}
      className="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            autoFocus
            onClick={() => {
              request?.onConfirm();
              onClose();
            }}
          >
            {request?.action}
          </Button>
        </>
      }
    />
  );
}
