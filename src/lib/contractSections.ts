import { getTemplateClauses, DISCLAIMER } from "@/lib/contractTemplates";

export type ContractSections = {
  title: string;
  parties: { contratante: string; contratado: string };
  clauses: { heading: string; body: string }[];
  footer: string[];
};

export function buildContractSections(
  tplTitle: string,
  form: {
    partyA: string; cnpjA?: string; cityA?: string;
    partyB: string; cnpjB?: string; cityB?: string;
    value: string; term: string; sector: string; foro?: string; notes: string;
  },
  tplId?: string,
): ContractSections {
  const clauses = getTemplateClauses(tplId ?? "servicos", form);
  const footer = [
    form.notes ? `Observações: ${form.notes}` : "",
    DISCLAIMER,
  ].filter(Boolean);

  const cnpjA = form.cnpjA?.trim() || "[CNPJ/CPF]";
  const cityA = form.cityA?.trim() || "[cidade/estado]";
  const cnpjB = form.cnpjB?.trim() || "[CNPJ/CPF]";
  const cityB = form.cityB?.trim() || "[cidade/estado]";

  return {
    title: `CONTRATO DE ${tplTitle.toUpperCase()}`,
    parties: {
      contratante: `CONTRATANTE: ${form.partyA || "Empresa XYZ LTDA"}, inscrita no CNPJ/CPF n.º ${cnpjA}, com sede em ${cityA}.`,
      contratado: `CONTRATADO: ${form.partyB || "Fornecedor ABC LTDA"}, inscrita no CNPJ/CPF n.º ${cnpjB}, com sede em ${cityB}.`,
    },
    clauses,
    footer,
  };
}
