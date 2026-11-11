import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function deleteAuthenticatedAccount(admin: SupabaseClient<Database>, userId: string) {
  if (!userId) throw new Error("Entre novamente para excluir sua conta.");
  // Storage-owned objects prevent Auth deletion; delete through the Storage API first.
  while (true) {
    const { data: files, error } = await admin.storage.from("business-photos").list(userId, { limit: 100 });
    if (error) throw new Error("Não foi possível remover suas fotos. Tente novamente.");
    if (!files?.length) break;
    const { error: removeError } = await admin.storage.from("business-photos").remove(files.map(file => `${userId}/${file.name}`));
    if (removeError) throw new Error("Não foi possível remover suas fotos. Tente novamente.");
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error("Não foi possível excluir sua conta. Tente novamente.");
  return { deleted: true };
}