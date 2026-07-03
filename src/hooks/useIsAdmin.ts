import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase
      .from("users")
      .select("role")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, []);

  return isAdmin;
}
