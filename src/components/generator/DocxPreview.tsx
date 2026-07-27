import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Renderiza o DOCX preenchido de verdade (com as tabelas dos Anexos I-IV
// formatadas), em vez de um texto corrido — o preview antigo (texto puro) não
// reproduzia a estrutura real dos modelos da biblioteca.
export function DocxPreview({ blob }: { blob: Blob | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    container.innerHTML = "";

    import("docx-preview").then(({ renderAsync }) =>
      renderAsync(blob, container, undefined, {
        className: "docx-preview",
        inWrapper: false,
        ignoreWidth: true,
        ignoreHeight: true,
      })
        .catch(() => {
          if (!cancelled) setError("Não foi possível pré-visualizar o documento.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        }),
    );

    return () => { cancelled = true; };
  }, [blob]);

  return (
    <div className="rounded-lg border border-border overflow-y-auto bg-muted/20" style={{ maxHeight: 480 }}>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Gerando pré-visualização...
        </div>
      )}
      {error && <p className="text-sm text-destructive text-center py-10">{error}</p>}
      {/* Fundo branco proposital: o documento é texto preto sobre branco (como no
          Word), precisa desse contraste independente do tema escuro do app. */}
      <div ref={containerRef} className="docx-preview-container bg-white text-black p-4 md:p-6 m-2 md:m-3 rounded shadow-sm" />
    </div>
  );
}
