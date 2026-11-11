import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Revalidate the session with Auth; no caller-supplied ID is accepted.
    const { data, error } = await context.supabase.auth.getUser();
    if (error || !data.user || data.user.id !== context.userId) throw new Error("Entre novamente para excluir sua conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteAuthenticatedAccount } = await import("./delete-account.server");
    return deleteAuthenticatedAccount(supabaseAdmin, context.userId);
  });