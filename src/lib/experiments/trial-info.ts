import { format } from "date-fns";

/** Bench-sheet details entered before a trial is run. All fields are free text. */
export type TrialInfo = {
  experimentNo: string;
  /** Calendar day of the trial, `YYYY-MM-DD` in the user's local time. */
  date: string;
  animalNo: string;
  group: string;
  investigator: string;
};

export const TRIAL_INFO_FIELDS = [
  { key: "experimentNo", label: "Experiment no.", placeholder: "EXP-024" },
  { key: "date", label: "Date", placeholder: "" },
  { key: "animalNo", label: "Animal no.", placeholder: "M01" },
  { key: "group", label: "Group", placeholder: "Control" },
  { key: "investigator", label: "Investigator", placeholder: "Dr. Jane Smith" },
] as const satisfies readonly { key: keyof TrialInfo; label: string; placeholder: string }[];

export const todayLocal = () => format(new Date(), "yyyy-MM-dd");

export const emptyTrialInfo = (): TrialInfo => ({ experimentNo: "", date: todayLocal(), animalNo: "", group: "", investigator: "" });

export const hasTrialInfo = (info: TrialInfo | undefined) =>
  !!info && TRIAL_INFO_FIELDS.some((f) => f.key !== "date" && info[f.key].trim() !== "");

/** Rows prepended to the summary CSV so exported files identify the trial. */
export function trialInfoRows(info: TrialInfo | undefined): Record<string, string | number>[] {
  if (!info) return [];
  return TRIAL_INFO_FIELDS.map((f) => ({ section: "Experiment", measure: f.label, value: info[f.key].trim(), unit: "" }));
}
