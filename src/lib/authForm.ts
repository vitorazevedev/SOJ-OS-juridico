import { z } from "zod";

export type Mode = "login" | "signup" | "forgot" | "check_email" | "recovery_code";

export const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const signupSchema = loginSchema.extend({
  name:    z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  orgName: z.string().trim().min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
});

export const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const recoveryCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
});

export type FormErrors = Partial<Record<"email" | "password" | "name" | "orgName", string>>;

export const translateAuthError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este email já está cadastrado";
  if (m.includes("password should be at least")) return "A senha deve ter no mínimo 6 caracteres";
  if (m.includes("invalid email")) return "Email inválido";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar";
  if (m.includes("token has expired") || m.includes("otp") || m.includes("invalid token")) return "Código inválido ou expirado. Solicite um novo";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Tente novamente em instantes";
  if (m.includes("network")) return "Erro de conexão. Verifique sua internet";
  return "Algo deu errado. Tente novamente";
};
