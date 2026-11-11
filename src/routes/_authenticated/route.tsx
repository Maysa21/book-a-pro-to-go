import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Local session check: no network round-trip on every tab change.
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      if (error) await supabase.auth.signOut({ scope: "local" });
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
