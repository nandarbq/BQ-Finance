import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";
import logoDataUrl from "../assets/logo bq-finance.png?inline";
import { formatDateID, formatPercentID, formatRupiah } from "./format";
import { groupByCategory, groupByMember, resolveCategoryLabel, sortChronological } from "./exportData";
import type { Category, Member, Mode, Transaction, TxType } from "./types";

type RGB = [number, number, number];

const ACCENT: RGB = [0, 171, 107];
const GREEN: RGB = [22, 163, 74];
const RED: RGB = [220, 38, 38];
const INK: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const PANEL: RGB = [243, 246, 248];
const ROW_ALT: RGB = [247, 250, 249];
const WHITE: RGB = [255, 255, 255];

/** jsPDF-autotable menempelkan properti `lastAutoTable` di instance dokumen. */
type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY?: number } };

function baseTableStyles(): UserOptions {
  return {
    theme: "grid",
    styles: { lineColor: LINE, lineWidth: 0.5, fontSize: 9 },
    headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK, cellPadding: 6 },
    alternateRowStyles: { fillColor: ROW_ALT },
  };
}

function formatAmount(type: TxType, n: number): string {
  return (type === "in" ? "+" : "-") + formatRupiah(n);
}

/**
 * Logo sumber berukuran 1254x1254 padahal cuma digambar 48x48 pt, dan jsPDF
 * menyalin piksel aslinya apa adanya — membuat PDF membengkat sampai ~4,8 MB.
 * Penskalaan ulang lewat canvas menjaga berkas laporan tetap ringan dibagikan.
 */
const LOGO_MAX = 160;

async function shrinkLogo(src: string): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo gagal dimuat"));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = LOGO_MAX;
    canvas.height = LOGO_MAX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, LOGO_MAX, LOGO_MAX);
    const out = canvas.toDataURL("image/png");
    return out.length < src.length ? out : src;
  } catch {
    // Kanvas/Gambar tidak tersedia atau gagal: pakai berkas asli.
    return src;
  }
}

export async function exportTransactionPdf({
  transactions,
  members,
  mode = "pribadi",
  periodLabel = "",
  displayName = "",
  categories = [],
  filterType = "all",
  searchQuery = "",
}: {
  transactions: Transaction[];
  members: Member[];
  mode?: Mode;
  periodLabel?: string;
  displayName?: string;
  categories?: Category[];
  filterType?: "all" | "in" | "out";
  searchQuery?: string;
}): Promise<void> {
  // Salinan terurut naik: tanggal paling awal lebih dulu. Urutan tampilan di
  // layar (terbaru di atas) tidak diubah.
  const rows = sortChronological(transactions);

  const income = rows.reduce((s, t) => (t.type === "in" ? s + t.amount : s), 0);
  const expense = rows.reduce((s, t) => (t.type === "out" ? s + t.amount : s), 0);
  const balance = income - expense;

  const doc = new jsPDF({ unit: "pt", format: "a4" }) as AutoTableDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const topY = 44;
  const bottomLimit = pageH - 44;

  doc.setProperties({
    title: "Laporan Transaksi" + (periodLabel ? " - " + periodLabel : ""),
    subject: "Laporan transaksi BQ Finance",
    author: displayName || "BQ Finance",
    keywords: "laporan transaksi, keuangan, BQ Finance",
    creator: "BQ Finance",
  });

  const memberName = (id: string | null): string => {
    const m = members.find((x) => x.id === id);
    return m ? m.displayName || m.name : "";
  };

  const now = new Date();
  const generatedAt =
    now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
    ", " +
    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 0, pageW, 7, "F");

  const logo = logoDataUrl ? await shrinkLogo(logoDataUrl) : "";
  if (logo) {
    doc.addImage(logo, "PNG", marginX, 24, 48, 48);
  }

  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BQ Finance", marginX + 60, 52);

  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Laporan Transaksi", marginX, 102);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);

  let metaY = 122;
  doc.text(
    "Periode: " + periodLabel + "  |  Mode " + (mode === "keluarga" ? "Keluarga" : "Pribadi"),
    marginX,
    metaY
  );
  metaY += 16;
  doc.text(
    rows.length + " transaksi  |  Disusun oleh " + (displayName || "-") + "  |  " + generatedAt,
    marginX,
    metaY
  );

  // Catat filter yang sedang aktif supaya pembaca laporan tahu isiannya
  // tidak mewakili seluruh transaksi pada periode tersebut.
  const filterParts: string[] = [];
  if (filterType === "in") filterParts.push("Filter: Pemasukan");
  else if (filterType === "out") filterParts.push("Filter: Pengeluaran");
  const search = searchQuery.trim();
  if (search) filterParts.push('Pencarian: "' + search + '"');
  if (filterParts.length > 0) {
    metaY += 16;
    doc.text("Filter aktif  |  " + filterParts.join("  |  "), marginX, metaY);
  }

  const boxGap = 10;
  const boxW = (pageW - 2 * marginX - 2 * boxGap) / 3;
  const boxY = metaY + 24;
  const boxH = 56;
  const boxes: { label: string; value: string; bg: RGB; fg: RGB }[] = [
    { label: "Pemasukan", value: formatRupiah(income), bg: [234, 253, 239], fg: GREEN },
    { label: "Pengeluaran", value: formatRupiah(expense), bg: [254, 231, 231], fg: RED },
    {
      label: "Selisih",
      value: formatRupiah(balance),
      bg: [237, 244, 253],
      fg: balance >= 0 ? GREEN : RED,
    },
  ];
  boxes.forEach((b, i) => {
    const x = marginX + i * (boxW + boxGap);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.roundedRect(x, boxY, boxW, boxH, 8, 8, "F");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(b.label.toUpperCase(), x + 12, boxY + 18);
    doc.setTextColor(b.fg[0], b.fg[1], b.fg[2]);
    doc.setFontSize(12.5);
    doc.text(b.value, x + 12, boxY + 40);
  });

  let cursorY = boxY + boxH + 22;

  const drawSectionTitle = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(text, marginX, cursorY);
  };

  /** Pindah halaman bila ruang tersisa tidak cukup untuk judul + kepala tabel. */
  const ensureRoom = (needed: number) => {
    if (cursorY + needed > bottomLimit) {
      doc.addPage();
      cursorY = topY;
    }
  };

  const advancePastTable = (gap = 18) => {
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + gap;
  };

  const addCategoryRecap = (title: string, type: TxType) => {
    const recap = groupByCategory(rows, categories, type);
    if (recap.length === 0) return;

    ensureRoom(78);
    cursorY += 8;
    drawSectionTitle(title);
    cursorY += 12;

    const total = recap.reduce((s, r) => s + r.total, 0);
    const totalCount = recap.reduce((s, r) => s + r.count, 0);

    autoTable(doc, {
      ...baseTableStyles(),
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Kategori", "Jumlah", "Transaksi", "% dari " + (type === "in" ? "Pemasukan" : "Pengeluaran")]],
      body: recap.map((r) => [r.label, formatAmount(type, r.total), String(r.count), formatPercentID(r.pct)]),
      foot: [["Jumlah", formatAmount(type, total), String(totalCount), formatPercentID(100)]],
      showFoot: "lastPage",
      footStyles: { fontSize: 9, fontStyle: "bold", textColor: INK, fillColor: PANEL },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "center" },
        3: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "foot") {
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.textColor = type === "in" ? GREEN : RED;
        }
      },
    });
    advancePastTable();
  };

  const addMemberRecap = () => {
    if (mode !== "keluarga") return;
    if (!rows.some((t) => t.memberId)) return;
    const recap = groupByMember(rows, members);
    if (recap.length === 0) return;

    ensureRoom(78);
    cursorY += 8;
    drawSectionTitle("Ringkasan per Anggota");
    cursorY += 12;

    autoTable(doc, {
      ...baseTableStyles(),
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Anggota", "Pemasukan", "Pengeluaran", "Selisih"]],
      body: recap.map((r) => [
        r.name,
        formatAmount("in", r.income),
        formatAmount("out", r.expense),
        formatRupiah(r.net),
      ]),
      foot: [
        [
          "Jumlah",
          formatAmount("in", recap.reduce((s, r) => s + r.income, 0)),
          formatAmount("out", recap.reduce((s, r) => s + r.expense, 0)),
          formatRupiah(balance),
        ],
      ],
      showFoot: "lastPage",
      footStyles: { fontSize: 9, fontStyle: "bold", textColor: INK, fillColor: PANEL },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "foot") {
          data.cell.styles.fontStyle = "bold";
          if (data.column.index === 3) {
            data.cell.styles.textColor = balance >= 0 ? GREEN : RED;
          }
          return;
        }
        if (data.section !== "body") return;
        if (data.column.index === 1) data.cell.styles.textColor = GREEN;
        else if (data.column.index === 2) data.cell.styles.textColor = RED;
        else if (data.column.index === 3) {
          const r = recap[data.row.index];
          data.cell.styles.textColor = r && r.net >= 0 ? GREEN : RED;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    advancePastTable();
  };

  const addDetailTable = () => {
    ensureRoom(96);
    cursorY += 8;
    drawSectionTitle("Rincian Transaksi");
    cursorY += 12;

    const withMember = mode === "keluarga";
    const head: string[][] = withMember
      ? [["No", "Tanggal", "Kategori", "Keterangan", "Anggota", "Jenis", "Jumlah"]]
      : [["No", "Tanggal", "Kategori", "Keterangan", "Jenis", "Jumlah"]];

    const body: string[][] = rows.map((t, i) => {
      const row: string[] = [
        String(i + 1),
        formatDateID(t.date),
        resolveCategoryLabel(categories, t.type, t.category),
        t.note || "-",
      ];
      if (withMember) row.push(memberName(t.memberId) || "-");
      row.push(t.type === "in" ? "Pemasukan" : "Pengeluaran");
      row.push(formatAmount(t.type, t.amount));
      return row;
    });

    const foot: string[][] = [
      ["", "", "", "", "Total Pemasukan", formatAmount("in", income)],
      ["", "", "", "", "Total Pengeluaran", formatAmount("out", expense)],
      ["", "", "", "", "Selisih", formatRupiah(balance)],
    ];
    if (withMember) {
      foot.forEach((r) => r.splice(4, 0, ""));
    }

    const amountCol = head[0].length - 1;

    autoTable(doc, {
      ...baseTableStyles(),
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head,
      body,
      foot,
      // Total bersifat kumulatif untuk seluruh laporan, jadi jangan diulang di
      // tiap halaman seolah-olah itu total per halaman.
      showFoot: "lastPage",
      footStyles: { fontSize: 9, fontStyle: "bold", textColor: INK, fillColor: PANEL },
      columnStyles: {
        0: { cellWidth: 28, halign: "center" },
        1: { cellWidth: 72 },
        [amountCol]: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === amountCol) {
          const tx = rows[data.row.index];
          data.cell.styles.textColor = tx && tx.type === "in" ? GREEN : RED;
        }
        if (data.section === "foot" && data.column.index === amountCol) {
          const val = String(data.cell.raw || "");
          if (val.startsWith("+")) data.cell.styles.textColor = GREEN;
          else if (val.startsWith("-")) data.cell.styles.textColor = RED;
          else data.cell.styles.textColor = balance >= 0 ? GREEN : RED;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    advancePastTable(0);
  };

  addCategoryRecap("Ringkasan Pengeluaran per Kategori", "out");
  addCategoryRecap("Ringkasan Pemasukan per Kategori", "in");
  addMemberRecap();
  addDetailTable();

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("helvetica", "normal");
    doc.text("BQ Finance - Laporan Transaksi", marginX, pageH - 16);
    doc.text("Halaman " + i + " dari " + pageCount, pageW - marginX, pageH - 16, { align: "right" });
  }

  const safeName =
    (periodLabel || "periode")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .trim()
      .replace(/^-+|-+$/g, "") || "periode";
  const fileName = "Laporan-Transaksi-" + safeName + ".pdf";

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
