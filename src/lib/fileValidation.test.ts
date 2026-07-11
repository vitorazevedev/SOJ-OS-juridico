// jsdom's Blob/File.slice() doesn't implement arrayBuffer() (as of jsdom 20) — run this
// file under Node's native File/Blob instead, since these are pure-logic tests with no DOM.
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { maxBytesFor, maxLabelFor, validateMagicBytes, MAX_BYTES_IMAGE, MAX_BYTES_PDF, MAX_BYTES_DOCX } from "./fileValidation";

function fileWithBytes(name: string, bytes: number[], type = ""): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]; // %PDF-1.4
const DOCX_MAGIC = [0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]; // PK zip
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const EXE_MAGIC = [0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0]; // "MZ" — Windows executable

describe("maxBytesFor", () => {
  it("usa o limite de imagem para .png e .jpg", () => {
    expect(maxBytesFor(fileWithBytes("foto.png", []))).toBe(MAX_BYTES_IMAGE);
    expect(maxBytesFor(fileWithBytes("foto.jpg", []))).toBe(MAX_BYTES_IMAGE);
  });

  it("usa o limite de docx quando o tipo ou extensão indicam Word", () => {
    expect(maxBytesFor(fileWithBytes("contrato.docx", [], "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe(MAX_BYTES_DOCX);
  });

  it("usa o limite de pdf como padrão", () => {
    expect(maxBytesFor(fileWithBytes("contrato.pdf", []))).toBe(MAX_BYTES_PDF);
  });
});

describe("maxLabelFor", () => {
  it("formata o limite em MB", () => {
    expect(maxLabelFor(fileWithBytes("foto.png", []))).toBe("5MB");
    expect(maxLabelFor(fileWithBytes("contrato.pdf", []))).toBe("32MB");
  });
});

describe("validateMagicBytes — barreira de segurança contra arquivos renomeados", () => {
  it("aceita PDF real com extensão .pdf", async () => {
    await expect(validateMagicBytes(fileWithBytes("contrato.pdf", PDF_MAGIC))).resolves.toBe(true);
  });

  it("aceita DOCX real com extensão .docx", async () => {
    await expect(validateMagicBytes(fileWithBytes("contrato.docx", DOCX_MAGIC))).resolves.toBe(true);
  });

  it("aceita PNG real com extensão .png", async () => {
    await expect(validateMagicBytes(fileWithBytes("foto.png", PNG_MAGIC))).resolves.toBe(true);
  });

  it("aceita JPEG real com extensão .jpg/.jpeg", async () => {
    await expect(validateMagicBytes(fileWithBytes("foto.jpg", JPEG_MAGIC))).resolves.toBe(true);
    await expect(validateMagicBytes(fileWithBytes("foto.jpeg", JPEG_MAGIC))).resolves.toBe(true);
  });

  it("rejeita um executável renomeado para .pdf", async () => {
    await expect(validateMagicBytes(fileWithBytes("virus.pdf", EXE_MAGIC))).resolves.toBe(false);
  });

  it("rejeita um executável renomeado para .docx", async () => {
    await expect(validateMagicBytes(fileWithBytes("virus.docx", EXE_MAGIC))).resolves.toBe(false);
  });

  it("rejeita extensão não reconhecida", async () => {
    await expect(validateMagicBytes(fileWithBytes("arquivo.txt", PDF_MAGIC))).resolves.toBe(false);
  });
});
