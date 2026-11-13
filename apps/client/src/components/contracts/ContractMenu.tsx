import { ArrowUpRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { DbContract } from "@/hooks/useContracts";

export function ContractMenu({
  contract,
  onDelete,
  onRename,
  onAnalyze,
}: {
  contract: DbContract;
  onDelete: (c: DbContract) => void;
  onRename: (c: DbContract) => void;
  onAnalyze: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-md hover:bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onAnalyze}>
          <ArrowUpRight className="h-4 w-4 mr-2" /> Ver análise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(contract)}>
          <Pencil className="h-4 w-4 mr-2" /> Renomear
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-risk-critical focus:text-risk-critical"
          onClick={() => onDelete(contract)}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
