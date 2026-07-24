import { useOrganization } from "@/hooks/useOrganization";

// plan_status='active' é a única forma de saber se a organização é
// Starter pago; 'trial' é o Freemium (mesmo plan_id='starter' pros dois,
// ver src/lib/pricing.ts).
export function useIsStarterPlan(): boolean {
  const { org } = useOrganization();
  return org?.plan_status === "active";
}
