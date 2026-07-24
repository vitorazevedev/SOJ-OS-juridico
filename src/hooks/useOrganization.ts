import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type Organization = {
  id: string;
  name: string;
  cnpj: string | null;
  sector: string | null;
  logo_url: string | null;
  plan_id: string;
  plan_status: string;
  trial_ends_at: string | null;
  plan_renews_at: string | null;
  created_at: string;
};

export type OrgUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  org_id: string;
  created_at: string;
};

async function getOrgId(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", u.user.id)
    .maybeSingle();
  return data?.org_id ?? null;
}

export function useOrganization() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    setLoading(true);
    const orgId = await getOrgId();
    if (!orgId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();
    setOrg((data as Organization) ?? null);
    if (data?.logo_url) {
      const { data: signed } = await supabase.storage
        .from("contracts")
        .createSignedUrl(data.logo_url, 60 * 60 * 24 * 7);
      setLogoUrl(signed?.signedUrl ?? null);
    } else {
      setLogoUrl(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const updateOrg = useCallback(
    async (patch: Partial<Pick<Organization, "name" | "cnpj" | "sector" | "logo_url">>) => {
      if (!org) return;
      const { error } = await supabase
        .from("organizations")
        .update(patch)
        .eq("id", org.id);
      if (error) throw error;
      await fetchOrg();
    },
    [org, fetchOrg],
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!org) throw new Error("Organização não encontrada");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${org.id}/logo/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      if (org.logo_url && org.logo_url !== path) {
        await supabase.storage.from("contracts").remove([org.logo_url]);
      }

      await updateOrg({ logo_url: path });
    },
    [org, updateOrg],
  );

  const removeLogo = useCallback(async () => {
    if (!org?.logo_url) return;
    await supabase.storage.from("contracts").remove([org.logo_url]);
    await updateOrg({ logo_url: null });
  }, [org, updateOrg]);

  return { org, loading, logoUrl, refresh: fetchOrg, updateOrg, uploadLogo, removeLogo };
}

export async function getCurrentOrgLogoSignedUrl(): Promise<string | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const { data } = await supabase
    .from("organizations")
    .select("logo_url")
    .eq("id", orgId)
    .maybeSingle();
  if (!data?.logo_url) return null;
  const { data: signed } = await supabase.storage
    .from("contracts")
    .createSignedUrl(data.logo_url, 60 * 60 * 24 * 7);
  return signed?.signedUrl ?? null;
}

export function useOrgUsers() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });
    setUsers((data as OrgUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateRole = useCallback(
    async (userId: string, role: string) => {
      const { error } = await supabase.from("users").update({ role }).eq("id", userId);
      if (error) throw error;
      await fetch();
    },
    [fetch],
  );

  const removeUser = useCallback(
    async (userId: string) => {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      await fetch();
    },
    [fetch],
  );

  return { users, loading, refresh: fetch, updateRole, removeUser };
}
