import { useState } from "react";
import { emptyTrialInfo, todayLocal, type TrialInfo } from "@/lib/experiments/trial-info.ts";

const STORAGE_KEY = "ethotrace.trial-info";

// Remember the bench sheet between visits; the date always restarts at today.
function loadInitial(): TrialInfo {
  const base = emptyTrialInfo();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return base;
    const merged = { ...base };
    for (const key of Object.keys(base) as (keyof TrialInfo)[]) {
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value === "string" && key !== "date") merged[key] = value;
    }
    return merged;
  } catch {
    return base;
  }
}

export function useTrialInfo() {
  const [info, setInfo] = useState<TrialInfo>(loadInitial);

  const update = (patch: Partial<TrialInfo>) => {
    setInfo((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); the panel still works for this visit.
      }
      return next;
    });
  };

  const resetDate = () => update({ date: todayLocal() });

  return { info, update, resetDate };
}

export type TrialInfoState = ReturnType<typeof useTrialInfo>;
