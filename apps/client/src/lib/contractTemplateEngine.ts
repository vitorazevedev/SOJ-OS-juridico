import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Os 54 modelos da biblioteca usam placeholders no padrão {{CAMPO}} (chave dupla),
// diferente do delimitador padrão do docxtemplater ({ }, chave simples) —
// confirmado lendo o XML de vários modelos reais. Nenhum campo é opcional aqui:
// o formulário (DynamicFieldsStep) já exige todos os campos do modelo antes de
// permitir gerar, mas o nullGetter é uma defesa extra pra nunca deixar um
// {{CAMPO}} cru vazando pro documento final.
// Aviso exigido pela Cláusula 2.4 dos Termos de Uso ("Toda minuta gerada pela
// Plataforma traz o aviso: ..."). Injetado como último parágrafo do corpo do
// documento, antes de <w:sectPr> (propriedades de seção sempre ficam no fim
// de <w:body>, depois do último parágrafo) — funciona em qualquer um dos 54
// modelos sem precisar editar cada .docx manualmente.
const LEGAL_NOTICE_TEXT =
  "Este documento foi gerado pelo Ponderum com base em modelos padrão de mercado. " +
  "Recomendamos revisão por advogado habilitado antes da assinatura.";

function injectLegalNotice(zip: PizZip): void {
  const file = zip.file("word/document.xml");
  if (!file) return;
  const xml = file.asText();
  const noticeParagraph =
    '<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="808080"/></w:rPr></w:pPr>' +
    '<w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="808080"/></w:rPr>' +
    `<w:t xml:space="preserve">${LEGAL_NOTICE_TEXT}</w:t></w:r></w:p>`;
  const sectPrIdx = xml.lastIndexOf("<w:sectPr");
  const newXml = sectPrIdx >= 0
    ? xml.slice(0, sectPrIdx) + noticeParagraph + xml.slice(sectPrIdx)
    : xml.replace("</w:body>", noticeParagraph + "</w:body>");
  zip.file("word/document.xml", newXml);
}

export async function renderContractDocx(
  templateUrl: string,
  values: Record<string, string>,
): Promise<Blob> {
  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error("Não foi possível carregar o modelo de contrato");
  const arrayBuffer = await res.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => `[PENDENTE: ${part.value}]`,
  });

  doc.render(values);
  injectLegalNotice(zip);
  // `mimeType` existe em tempo de execução (repassado ao pizzip's zip.generate),
  // mas não está tipado em DXT.ZipOptions — sem isso o Blob sai como
  // application/zip em vez do content-type correto de .docx.
  return doc.toBlob({ mimeType: DOCX_MIME } as Parameters<typeof doc.toBlob>[0]);
}

// Extrai um texto simples do DOCX já preenchido, só pra popular o campo
// content_docx de generated_contracts (usado hoje pelo fallback "Baixar PDF"
// do Histórico). Mesma técnica de strip de XML usada pra ler os modelos
// originais durante a implementação desta engine — sem dependência nova.
export async function extractPlainTextFromDocx(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
