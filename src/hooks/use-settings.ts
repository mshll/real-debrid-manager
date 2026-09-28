import { DEFAULT_SETTINGS, settingsItem, updateSettings, type Settings } from "@/lib/storage";

import { useStorageItem } from "./use-storage";

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const stored = useStorageItem(settingsItem);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const update = (patch: Partial<Settings>): void => {
    updateSettings(patch).catch((error: unknown) => console.error("Settings save failed", error));
  };
  return [settings, update];
}
