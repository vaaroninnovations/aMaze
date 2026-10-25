import { describe, expect, it } from "vitest";
import { emptyTrialInfo, hasTrialInfo, trialInfoRows } from "./trial-info.ts";

describe("trial info", () => {
  it("treats a sheet with only the auto date as empty", () => {
    expect(hasTrialInfo(emptyTrialInfo())).toBe(false);
    expect(hasTrialInfo({ ...emptyTrialInfo(), investigator: "  " })).toBe(false);
    expect(hasTrialInfo({ ...emptyTrialInfo(), animalNo: "M01" })).toBe(true);
  });

  it("produces one trimmed CSV row per field", () => {
    const rows = trialInfoRows({ experimentNo: " EXP-1 ", date: "2026-10-05", animalNo: "M01", group: "Control", investigator: "J. Smith" });
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ section: "Experiment", measure: "Experiment no.", value: "EXP-1", unit: "" });
    expect(trialInfoRows(undefined)).toEqual([]);
  });
});
