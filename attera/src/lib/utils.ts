export function pct(present: number, total: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 1000) / 10;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) =>
    typeof v === "string" && (v.includes(",") || v.includes('"'))
      ? `"${v.replace(/"/g, '""')}"`
      : String(v);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
