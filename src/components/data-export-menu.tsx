import { useState } from "react";
import { Download, FileSpreadsheet, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { downloadRows, downloadXlsxFile, type Row, type Sheet } from "@/lib/export-data.ts";

export type ExportDataset = {
  /** Shown in the menu, also used as the sheet name. */
  label: string;
  /** File name without extension. */
  filename: string;
  /** Called on click so large tables are only built when needed. */
  rows: () => Row[] | Promise<Row[]>;
};

type Props = {
  datasets: ExportDataset[];
  /** When set, adds a one-file workbook with every dataset as its own sheet. */
  workbookName?: string;
  disabled?: boolean;
  label?: string;
};

/** Export menu: each table as CSV or XLSX, plus an optional all-in-one workbook. */
export default function DataExportMenu({ datasets, workbookName, disabled, label = "Export data" }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch {
      toast.error("Could not create the export. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const exportOne = (d: ExportDataset, format: "csv" | "xlsx") =>
    run(async () => downloadRows(format, d.filename, d.label, await d.rows()));

  const exportWorkbook = (name: string) =>
    run(async () => {
      const sheets: Sheet[] = [];
      for (const d of datasets) sheets.push({ name: d.label, rows: await d.rows() });
      await downloadXlsxFile(name, sheets);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled || busy}>
          {busy ? <Spinner /> : <Download />} <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {datasets.map((d, i) => (
          <div key={d.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{d.label}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportOne(d, "csv")} className="cursor-pointer">
              <FileSpreadsheet /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportOne(d, "xlsx")} className="cursor-pointer">
              <Table2 /> Excel (XLSX)
            </DropdownMenuItem>
          </div>
        ))}
        {workbookName && datasets.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportWorkbook(workbookName)} className="cursor-pointer">
              <Table2 /> All in one Excel workbook
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
