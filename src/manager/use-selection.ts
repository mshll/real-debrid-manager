import { useMemo, useRef, useState } from "react";

export interface Selection {
  selected: Set<string>;
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string, index: number, range: boolean) => void;
  setAll: (checked: boolean) => void;
  clear: () => void;
}

/** Selection pruned to the ids currently visible, with shift-click ranges. */
export function useSelection(ids: string[]): Selection {
  const [raw, setRaw] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);
  const selected = useMemo(() => new Set(ids.filter((id) => raw.has(id))), [ids, raw]);

  const toggle = (id: string, index: number, range: boolean): void => {
    const next = new Set(selected);
    if (range && anchor.current !== null) {
      const [from, to] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
      for (const rangeId of ids.slice(from, to + 1)) next.add(rangeId);
    } else if (next.has(id)) next.delete(id);
    else next.add(id);
    anchor.current = index;
    setRaw(next);
  };

  return {
    selected,
    count: selected.size,
    has: (id) => selected.has(id),
    toggle,
    setAll: (checked) => setRaw(checked ? new Set(ids) : new Set()),
    clear: () => setRaw(new Set()),
  };
}
