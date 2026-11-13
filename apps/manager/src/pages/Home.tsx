import { SojCard } from "@ponderum/ui";
import { useAuth } from "@/features/auth/components/AuthProvider";

export default function Home() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SojCard className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Bem-vindo(a), {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O Ponderum Manager ainda está em construção. As áreas de Dev, Equipe e Financeiro migram
          para cá nas próximas fases.
        </p>
      </SojCard>
    </div>
  );
}
