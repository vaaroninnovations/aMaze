import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const PAGE_MARGIN = 14;
const HEAD_FILL: [number, number, number] = [30, 130, 140];
const MUTED: [number, number, number] = [110, 120, 130];

/** Tracks the vertical write position so sections can flow across pages. */
export type Cursor = { doc: jsPDF; y: number };

export const pageWidth = (doc: jsPDF) => doc.internal.pageSize.getWidth();
export const pageHeight = (doc: jsPDF) => doc.internal.pageSize.getHeight();
export const contentWidth = (doc: jsPDF) => pageWidth(doc) - PAGE_MARGIN * 2;

export function newCursor(): Cursor {
  return { doc: new jsPDF({ unit: "mm", format: "a4" }), y: PAGE_MARGIN };
}

/** Starts a new page when less than `needed` mm remain. */
export function ensureSpace(c: Cursor, needed: number) {
  if (c.y + needed > pageHeight(c.doc) - PAGE_MARGIN) {
    c.doc.addPage();
    c.y = PAGE_MARGIN;
  }
}

export function addTitle(c: Cursor, title: string, subtitle: string[]) {
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(20);
  c.doc.setTextColor(20, 30, 40);
  c.doc.text(title, PAGE_MARGIN, c.y + 6);
  c.y += 12;
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(9.5);
  c.doc.setTextColor(...MUTED);
  for (const line of subtitle) {
    c.doc.text(line, PAGE_MARGIN, c.y);
    c.y += 5;
  }
  c.y += 3;
}

export function addHeading(c: Cursor, text: string) {
  ensureSpace(c, 14);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(12);
  c.doc.setTextColor(20, 30, 40);
  c.doc.text(text, PAGE_MARGIN, c.y + 4);
  c.doc.setDrawColor(...HEAD_FILL);
  c.doc.setLineWidth(0.4);
  c.doc.line(PAGE_MARGIN, c.y + 6, pageWidth(c.doc) - PAGE_MARGIN, c.y + 6);
  c.y += 10;
}

export function addNote(c: Cursor, text: string) {
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(8.5);
  c.doc.setTextColor(...MUTED);
  const lines = c.doc.splitTextToSize(text, contentWidth(c.doc));
  ensureSpace(c, lines.length * 4);
  c.doc.text(lines, PAGE_MARGIN, c.y + 3);
  c.y += lines.length * 4 + 2;
}

export function addTable(c: Cursor, head: string[], body: string[][], rightAlignFrom = 1) {
  let endY = c.y;
  autoTable(c.doc, {
    startY: c.y,
    head: [head],
    body,
    theme: "striped",
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: HEAD_FILL, textColor: 255 },
    columnStyles: Object.fromEntries(head.map((_, i) => [i, { halign: i >= rightAlignFrom ? "right" : "left" }])),
    didDrawPage: (d) => {
      endY = d.cursor?.y ?? endY;
    },
  });
  c.y = endY + 6;
}

/** Adds an image scaled to the page width (and a max height), keeping its aspect ratio. */
export function addFigure(c: Cursor, dataUrl: string, caption: string, maxHeight = 110) {
  const props = c.doc.getImageProperties(dataUrl);
  const ratio = props.width / props.height;
  let w = Math.min(contentWidth(c.doc), maxHeight * ratio);
  let h = w / ratio;
  if (h > maxHeight) {
    h = maxHeight;
    w = h * ratio;
  }
  ensureSpace(c, h + 10);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(9.5);
  c.doc.setTextColor(20, 30, 40);
  c.doc.text(caption, PAGE_MARGIN, c.y + 3);
  c.y += 5;
  c.doc.addImage(dataUrl, props.fileType, PAGE_MARGIN, c.y, w, h);
  c.y += h + 6;
}

/** Page numbers and footer on every page; call once when the document is complete. */
export function addFooters(c: Cursor, label: string) {
  const total = c.doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    c.doc.setPage(i);
    c.doc.setFont("helvetica", "normal");
    c.doc.setFontSize(8);
    c.doc.setTextColor(...MUTED);
    c.doc.text(label, PAGE_MARGIN, pageHeight(c.doc) - 7);
    c.doc.text(`Page ${i} of ${total}`, pageWidth(c.doc) - PAGE_MARGIN, pageHeight(c.doc) - 7, { align: "right" });
  }
}
