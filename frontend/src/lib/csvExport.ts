/**
 * csvExport — client-side CSV oluşturucu + indirme tetikleyici.
 *
 * Tasarım kararı: Bazı tablolar (audit log, jobs registry) admin'in görsel
 * olarak filtrelediği state üzerinden export bekliyor. Backend tarafında her
 * tablo için ayrı export endpoint açmak yerine, görüntülenen veriyi olduğu
 * gibi CSV'ye çevirip indirmek deterministik ve şeffaf bir çözüm.
 *
 * Davranış admin panelden "settings" üzerinden gizli değil — kullanıcı tablo
 * ne görüyorsa onu indirir, başka bir filtre uygulanmaz, gizli alan eklenmez.
 *
 * Excel uyumluluğu için BOM (\uFEFF) eklenir; Türkçe karakterler doğru görünür.
 */

export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<Row> {
  /** Başlık satırı etiketi */
  header: string;
  /** Satırdan değer üreten fonksiyon */
  value: (row: Row) => CsvCell;
}

function escapeCell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // RFC 4180: virgül, tırnak, satır sonu varsa tırnaklayıp içerideki tırnağı çiftle
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(c.value(r))).join(","))
    .join("\r\n");
  return `\uFEFF${header}\r\n${body}`;
}

export function downloadCsv(filename: string, csvText: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Bir sonraki tick'te revoke — bazı tarayıcılarda hemen revoke edersek
  // indirme iptal oluyor.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRowsAsCsv<Row>(
  filename: string,
  rows: readonly Row[],
  columns: readonly CsvColumn<Row>[],
): void {
  const csv = buildCsv(rows, columns);
  downloadCsv(filename, csv);
}

/** ISO timestamp ile dosya adı stamp'ı: 20260419-153045 */
export function csvTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
