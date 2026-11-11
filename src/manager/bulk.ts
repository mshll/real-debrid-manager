import { toast } from "sonner";

/** Runs one at a time (RD rate-limits parallel writes) and keeps going past failures. */
export async function runEach<T>(items: T[], run: (item: T) => Promise<unknown>): Promise<number> {
  let failed = 0;
  for (const item of items) {
    try {
      await run(item);
    } catch (error) {
      failed++;
      console.error(error);
    }
  }
  return failed;
}

export function reportBulk(toastId: string | number, verb: string, total: number, failed: number): void {
  if (!failed) toast.success(total === 1 ? verb : `${verb} ${total}`, { id: toastId });
  else if (failed === total) toast.error(total === 1 ? `Couldn't finish` : `All ${total} failed`, { id: toastId });
  else toast.error(`${verb} ${total - failed}, ${failed} failed`, { id: toastId });
}
