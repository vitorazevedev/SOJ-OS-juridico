import { SojCard } from "@/components/layout/Primitives";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { Palette } from "lucide-react";

export function PersonalizeTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-4 md:gap-6 mt-4">
      <SojCard className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm md:text-base">Aparência</h3>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Modo claro</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alterna entre o modo escuro (padrão) e o modo claro da plataforma
            </p>
          </div>
          <Switch
            checked={theme === "light"}
            onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
          />
        </div>
      </SojCard>
    </div>
  );
}
