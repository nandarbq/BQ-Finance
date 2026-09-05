import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import logoUrl from "../assets/bq-logo-full.png";

let logoDataUrlPromise;

function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(logoUrl)
      .then((response) => response.blob())
      .then((blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      }))
      .catch(() => null);
  }
  return logoDataUrlPromise;
}

const CAT_LABELS = {
  in: {
    gaji: "Gaji",
    bonus: "Bonus",
    usaha: "Usaha",
    hadiah: "Hadiah",
    investasi: "Investasi",
    lainnya_in: "Lainnya",
  },
  out: {
    makanan: "Makanan",
    transport: "Transport",
    belanja: "Belanja",
    tagihan: "Tagihan",
    hiburan: "Hiburan",
    kesehatan: "Kesehatan",
    pendidikan: "Pendidikan",
    lainnya_out: "Lainnya",
  },
};

const ACCENT = [0, 171, 107];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];

function categoryLabel(type, catId) {
  const list = CAT_LABELS[type] || {};
  return list[catId] || catId || "Lainnya";
}

function rupiah(n) {
  const v = Math.round(Math.abs(Number(n) || 0));
  return "Rp " + v.toLocaleString("id-ID");
}

function formatAmount(type, n) {
  return (type === "in" ? "+" : "-") + rupiah(n);
}

export async function exportTransactionPdf({ transactions, members, mode = "pribadi", periodLabel = "", displayName = "" }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const logoDataUrl = await getLogoDataUrl();

  const memberName = (id) => {
    const m = members.find((x) => x.id === id);
    return m ? m.name : "";
  };

  const income = transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const now = new Date();
  const generatedAt =
    now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
    ", " +
    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 0, pageW, 7, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", marginX, 24, 48, 48);
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
  doc.text("Periode: " + periodLabel + "  |  Mode " + (mode === "keluarga" ? "Keluarga" : "Pribadi"), marginX, 122);
  doc.text(transactions.length + " transaksi  |  Disusun oleh " + (displayName || "-") + "  |  " + generatedAt, marginX, 138);

  const boxGap = 10;
  const boxW = (pageW - 2 * marginX - 2 * boxGap) / 3;
  const boxY = 162;
  const boxH = 56;
  const boxes = [
    { label: "Pemasukan", value: rupiah(income), bg: [234, 253, 239], fg: GREEN },
    { label: "Pengeluaran", value: rupiah(expense), bg: [254, 231, 231], fg: RED },
    { label: "Selisih", value: rupiah(balance), bg: [237, 244, 253], fg: balance >= 0 ? GREEN : RED },
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

  const withMember = mode === "keluarga";
  const head = withMember
    ? [["No", "Tanggal", "Kategori", "Keterangan", "Anggota", "Jenis", "Jumlah"]]
    : [["No", "Tanggal", "Kategori", "Keterangan", "Jenis", "Jumlah"]];

  const body = transactions.map((t, i) => {
    const row = [
      String(i + 1),
      t.date,
      categoryLabel(t.type, t.category),
      t.note || "-",
    ];
    if (withMember) row.push(memberName(t.memberId));
    row.push(t.type === "in" ? "Pemasukan" : "Pengeluaran");
    row.push(formatAmount(t.type, t.amount));
    return row;
  });

  const foot = [["", "", "", "", "Total Pemasukan", formatAmount("in", income)], ["", "", "", "", "Total Pengeluaran", formatAmount("out", expense)], ["", "", "", "", "Selisih", rupiah(balance)]];
  if (withMember) {
    foot.forEach((r) => r.splice(4, 0, ""));
  }

  const amountCol = head[0].length - 1;

  autoTable(doc, {
    startY: 240,
    margin: { left: marginX, right: marginX },
    head,
    body,
    foot,
    theme: "grid",
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK, cellPadding: 6 },
    footStyles: { fontSize: 9, fontStyle: "bold", textColor: INK, fillColor: [243, 246, 248] },
    alternateRowStyles: { fillColor: [247, 250, 249] },
    styles: { lineColor: LINE, lineWidth: 0.5 },
    columnStyles: {
      0: { cellWidth: 28, halign: "center" },
      1: { cellWidth: 72 },
      [amountCol]: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === amountCol) {
        const tx = transactions[data.row.index];
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

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("helvetica", "normal");
    doc.text("BQ Finance - Laporan Transaksi", marginX, pageH - 16);
    doc.text("Halaman " + i + " dari " + pageCount, pageW - marginX, pageH - 16, { align: "right" });
  }

  const safeName = (periodLabel || "periode").replace(/[^a-z0-9]+/gi, "-").toLowerCase().trim().replace(/^-+|-+$/g, "") || "periode";
  doc.save("Laporan-Transaksi-" + safeName + ".pdf");
}