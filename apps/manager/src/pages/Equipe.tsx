import { CreateStarterUserForm } from "@/components/equipe/CreateStarterUserForm";
import { OrganizationsManagementList } from "@/components/equipe/OrganizationsManagementList";
import { ExecutiveDashboard } from "@/components/equipe/ExecutiveDashboard";
import { RecentActivityFeed } from "@/components/equipe/RecentActivityFeed";

export default function Equipe() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Equipe Ponderum</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ponderum · Visão interna</p>
      </div>

      <ExecutiveDashboard />
      <CreateStarterUserForm />
      <OrganizationsManagementList />
      <RecentActivityFeed />
    </div>
  );
}
