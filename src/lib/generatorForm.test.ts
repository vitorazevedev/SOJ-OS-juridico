import { describe, it, expect } from "vitest";
import { slugifyName, parseValueToCents } from "./generatorForm";
import { validateDynamicFields } from "./dynamicContractForm";

describe("slugifyName", () => {
  it("remove acentos e caracteres especiais", () => {
    expect(slugifyName("NDA com Fornecedor Ação Ltda.")).toBe("nda-com-fornecedor-acao-ltda");
  });

  it("usa 'contrato' como fallback para nome vazio", () => {
    expect(slugifyName("")).toBe("contrato");
  });
});

describe("parseValueToCents", () => {
  it("converte formato brasileiro (ponto de milhar, vírgula decimal) para centavos", () => {
    expect(parseValueToCents("120.000,00")).toBe(12000000);
  });

  it("retorna null para valor vazio", () => {
    expect(parseValueToCents("")).toBeNull();
  });

  it("retorna null para texto não numérico", () => {
    expect(parseValueToCents("abc")).toBeNull();
  });
});

describe("validateDynamicFields", () => {
  const fields = ["OBJETO_RESUMIDO", "PARTE_A_CNPJ"];

  it("exige todos os campos do modelo preenchidos", () => {
    const errors = validateDynamicFields(fields, { OBJETO_RESUMIDO: "", PARTE_A_CNPJ: "" });
    expect(errors.OBJETO_RESUMIDO).toBeDefined();
    expect(errors.PARTE_A_CNPJ).toBeDefined();
  });

  it("aceita quando todos os campos estão preenchidos e o CNPJ é válido", () => {
    const errors = validateDynamicFields(fields, {
      OBJETO_RESUMIDO: "Prestação de serviços de consultoria",
      PARTE_A_CNPJ: "11.222.333/0001-81",
    });
    expect(errors).toEqual({});
  });

  it("rejeita CNPJ/CPF inválido no campo de documento", () => {
    const errors = validateDynamicFields(fields, {
      OBJETO_RESUMIDO: "Prestação de serviços",
      PARTE_A_CNPJ: "11.111.111/1111-11",
    });
    expect(errors.PARTE_A_CNPJ).toBeDefined();
  });
});
