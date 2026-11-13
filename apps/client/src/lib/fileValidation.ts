export const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";

// Per-type limits driven by downstream constraints in parse-contract:
// images and PDFs go through Claude (Vision / document block) which caps
// uploads around 5MB and 32MB respectively; DOCX is parsed locally via
// mammoth and has no such ceiling, so it can use the full 50MB target.
export const MAX_BYTES_IMAGE = 5 * 1024 * 1024;
export const MAX_BYTES_PDF = 32 * 1024 * 1024;
export const MAX_BYTES_DOCX = 50 * 1024 * 1024;

export function maxBytesFor(file: File): number {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/.test(name)) return MAX_BYTES_IMAGE;
  if (file.type.includes("wordprocessingml") || name.endsWith(".docx")) return MAX_BYTES_DOCX;
  return MAX_BYTES_PDF;
}

export function maxLabelFor(file: File): string {
  const max = maxBytesFor(file);
  return `${Math.round(max / (1024 * 1024))}MB`;
}

// Valida os primeiros bytes do arquivo (magic bytes) para garantir que o tipo
// real corresponde à extensão declarada — impede renomear um .exe para .pdf.
export async function validateMagicBytes(file: File): Promise<boolean> {
  const buf = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const hex   = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  const name  = file.name.toLowerCase();
  if (name.endsWith(".pdf"))  return hex.startsWith("25504446");          // %PDF
  if (name.endsWith(".docx")) return hex.startsWith("504b0304");          // PK zip (OOXML)
  if (name.endsWith(".png"))  return hex.startsWith("89504e47");          // PNG
  if (name.endsWith(".jpg") || name.endsWith(".jpeg"))
    return hex.startsWith("ffd8ff");                                       // JPEG
  return false; // extensão não reconhecida
}
