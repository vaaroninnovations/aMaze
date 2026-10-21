import Papa from "papaparse";

export type DataFormat = "csv" | "xlsx";

export type Row = Record<string, string | number | null>;

export type Sheet = { name: string; rows: Row[] };

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Excel sheet names: max 31 chars, no \ / ? * [ ] : and must be unique. */
function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Sheet";
  let candidate = base;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${base} ${i}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

export function downloadCsvFile(filename: string, rows: Row[]) {
  // BOM so Excel opens UTF-8 text (names, units) correctly.
  saveBlob(`${filename}.csv`, new Blob(["\ufeff" + Papa.unparse(rows)], { type: "text/csv;charset=utf-8;" }));
}

/** exceljs is large, so it is only loaded when someone actually exports a workbook. */
export async function downloadXlsxFile(filename: string, sheets: Sheet[]) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const used = new Set<string>();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheetName(sheet.name, used));
    const columns = [...new Set(sheet.rows.flatMap((r) => Object.keys(r)))];
    ws.columns = columns.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(key.length + 2, 12), 40),
    }));
    for (const row of sheet.rows) ws.addRow(row);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(`${filename}.xlsx`, new Blob([buffer], { type: XLSX_MIME }));
}

/** Downloads one table as CSV, or as a single-sheet workbook. */
export async function downloadRows(format: DataFormat, filename: string, sheetLabel: string, rows: Row[]) {
  if (format === "csv") downloadCsvFile(filename, rows);
  else await downloadXlsxFile(filename, [{ name: sheetLabel, rows }]);
}
