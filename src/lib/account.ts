import { supabase } from "@/integrations/supabase/client";

export type AccountType = "client" | "professional";

export async function changeAccountType(accountType: AccountType) {
  if (accountType !== "client" && accountType !== "professional") {
    throw new Error("Tipo de conta inválido.");
  }
  const { error } = await supabase.rpc("set_my_account_type", { _account_type: accountType });
  if (error) throw error;
}

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
