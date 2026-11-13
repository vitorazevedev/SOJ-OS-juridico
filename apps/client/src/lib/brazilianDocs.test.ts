import { describe, it, expect } from "vitest";
import { formatDocument, validateDocument, validateCpf, validateCnpj } from "./brazilianDocs";

describe("validateDocument", () => {
  it("considera campo vazio válido (CNPJ/CPF é opcional no formulário)", () => {
    expect(validateDocument("")).toEqual({ valid: true, type: "unknown" });
  });

  it("valida um CPF real (dígitos verificadores corretos)", () => {
    expect(validateCpf("111.444.777-35")).toBe(true);
  });

  it("rejeita um CPF com dígito verificador errado", () => {
    expect(validateCpf("111.444.777-36")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(validateCpf("111.111.111-11")).toBe(false);
  });

  it("valida um CNPJ real (dígitos verificadores corretos)", () => {
    expect(validateCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita um CNPJ com dígito verificador errado", () => {
    expect(validateCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("classifica automaticamente CPF (<=11 dígitos) vs CNPJ (>11 dígitos)", () => {
    expect(validateDocument("111.444.777-35")).toEqual({ valid: true, type: "cpf" });
    expect(validateDocument("11.222.333/0001-81")).toEqual({ valid: true, type: "cnpj" });
  });
});

describe("formatDocument", () => {
  it("formata como CPF quando <= 11 dígitos", () => {
    expect(formatDocument("11144477735")).toBe("111.444.777-35");
  });

  it("formata como CNPJ quando > 11 dígitos", () => {
    expect(formatDocument("11222333000181")).toBe("11.222.333/0001-81");
  });
});
