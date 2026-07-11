import { describe, it, expect } from "vitest";
import { validateForm, slugifyName, parseValueToCents, EMPTY_FORM } from "./generatorForm";

describe("validateForm", () => {
  it("exige o nome do contrato", () => {
    const errors = validateForm({ ...EMPTY_FORM, name: "" });
    expect(errors.name).toBeDefined();
  });

  it("aceita um formulário mínimo válido (só com nome)", () => {
    const errors = validateForm({ ...EMPTY_FORM, name: "NDA com Fornecedor XYZ" });
    expect(errors).toEqual({});
  });

  it("rejeita CNPJ/CPF inválido quando preenchido", () => {
    const errors = validateForm({ ...EMPTY_FORM, name: "Contrato Teste", cnpjA: "11.111.111/1111-11" });
    expect(errors.cnpjA).toBeDefined();
  });

  it("aceita CNPJ válido quando preenchido", () => {
    const errors = validateForm({ ...EMPTY_FORM, name: "Contrato Teste", cnpjA: "11.222.333/0001-81" });
    expect(errors.cnpjA).toBeUndefined();
  });
});

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
