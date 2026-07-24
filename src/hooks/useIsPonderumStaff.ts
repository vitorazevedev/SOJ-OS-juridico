import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIsPonderumStaff(): boolean {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    supabase
      .from("users")
      .select("is_ponderum_staff")
      .maybeSingle()
      .then(({ data }) => setIsStaff(data?.is_ponderum_staff === true));
  }, []);

  return isStaff;
}
