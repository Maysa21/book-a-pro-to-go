import { supabase } from "@/integrations/supabase/client";

export async function saveAccountProfile(userId: string, fullName: string, phone: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim(), phone: phone.trim() })
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Não foi possível salvar sua conta.");
}
