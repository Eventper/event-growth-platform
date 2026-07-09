export const ISO_STANDARDS = [
  { id: "iso9001", label: "ISO 9001", desc: "Quality Management System" },
  { id: "iso27001", label: "ISO 27001", desc: "Information Security Management" },
  { id: "iso45001", label: "ISO 45001", desc: "Health & Safety Management" },
  { id: "iso14001", label: "ISO 14001", desc: "Environmental Management" },
];

export function filterByISO(items: any[], selectedISO: string[]) {
  if (!selectedISO.length) return items;
  return items.filter(item => 
    item.isoStandards?.some((iso: string) => selectedISO.includes(iso))
  );
}

export function formatISO(isoId: string): string {
  return ISO_STANDARDS.find(s => s.id === isoId)?.label || isoId;
}
