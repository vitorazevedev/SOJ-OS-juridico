import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrganizationTab } from "@/components/settings/OrganizationTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { PlanTab } from "@/components/settings/PlanTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { PrivacyTab } from "@/components/settings/PrivacyTab";

const VALID_TABS = ["organization", "users", "plan", "profile", "notifications", "privacy"];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "organization";

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-[1200px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="hidden md:block text-sm text-muted-foreground mt-1">
          Gerencie sua organização, usuários e plano
        </p>
      </div>

      <Tabs
        defaultValue={initialTab}
        onValueChange={(v) => setSearchParams(v === "organization" ? {} : { tab: v })}
        className="w-full"
      >
        <TabsList className="w-full md:w-auto justify-start flex-wrap">
          <TabsTrigger value="organization">Organização</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade e Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="plan">
          <PlanTab />
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
