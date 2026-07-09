type PrintColumn = {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
  format?: (value: any, row: any) => string;
};

type PrintOptions = {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  columns?: PrintColumn[];
  rows?: Record<string, any>[];
  customHtml?: string;
  orientation?: "portrait" | "landscape";
};

export function openPrintWindow(options: PrintOptions) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const statsHtml = options.stats?.length
    ? `<div class="stats">${options.stats.map(s => `<div class="stat-item"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div>`
    : "";

  const tableHtml = options.columns && options.rows?.length
    ? `<table><thead><tr>${options.columns.map(c => `<th style="text-align:${c.align || "left"}">${c.header}</th>`).join("")}</tr></thead><tbody>${options.rows.map((row, i) => `<tr class="${i % 2 === 1 ? "alt" : ""}">${options.columns!.map(c => `<td style="text-align:${c.align || "left"}">${c.format ? c.format(row[c.key], row) : (row[c.key] ?? "-")}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : "";

  printWindow.document.write(`<!DOCTYPE html><html><head><title>${options.title}</title>
    <style>
      @page { size: ${options.orientation || "portrait"}; margin: 15mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; margin: 0; }
      h1 { color: #330311; margin: 0 0 5px; font-size: 22px; }
      .subtitle { color: #666; margin: 0 0 20px; font-size: 13px; }
      .stats { display: flex; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8f8f8; border-radius: 8px; flex-wrap: wrap; }
      .stat-item { text-align: center; min-width: 80px; }
      .stat-value { font-size: 22px; font-weight: bold; color: #330311; }
      .stat-label { font-size: 11px; color: #666; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px; }
      th { text-align: left; padding: 8px; background: #330311; color: white; font-size: 12px; white-space: nowrap; }
      td { padding: 7px 8px; border-bottom: 1px solid #eee; }
      tr.alt { background: #f9f9f9; }
      .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
      .custom-content { margin: 15px 0; }
      @media print {
        body { padding: 10px; }
        .no-print { display: none !important; }
      }
    </style></head><body>
    <h1>${options.title}</h1>
    <p class="subtitle">${options.subtitle || `Printed: ${new Date().toLocaleString()}`}</p>
    ${statsHtml}
    ${tableHtml}
    ${options.customHtml ? `<div class="custom-content">${options.customHtml}</div>` : ""}
    <div class="footer">Event Perfekt — ...making yours perfekt</div>
  </body></html>`);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
