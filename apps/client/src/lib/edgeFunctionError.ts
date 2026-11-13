// supabase.functions.invoke() em resposta não-2xx devolve um erro genérico
// ("Edge Function returned a non-2xx status code") em error.message -- o
// corpo JSON real { error: "..." } que a function devolveu só está
// disponível em error.context (a Response original), precisa reler.
export async function getEdgeFunctionErrorMessage(error: { message?: string; context?: Response }, fallback: string): Promise<string> {
  const context = error?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // corpo não era JSON -- ignora e usa o fallback
    }
  }
  return error.message || fallback;
}
