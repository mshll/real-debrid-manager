import { useEffect, useState } from "react";
import type { WxtStorageItem } from "wxt/utils/storage";

/** Undefined while the first read is in flight. */
export function useStorageItem<T>(item: WxtStorageItem<T, Record<string, unknown>>): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    item
      .getValue()
      .then((initial) => alive && setValue(initial))
      .catch((error: unknown) => console.error("Storage read failed", error));
    const unwatch = item.watch((next) => setValue(next));
    return () => {
      alive = false;
      unwatch();
    };
  }, [item]);
  return value;
}
