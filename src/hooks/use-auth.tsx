import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "client" | "professional";
type Profile = { full_name: string; phone: string };
type AuthState = {
  user: User | null;
  role: Role | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  role: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (u: User | null) => {
    setUser(u);
    if (!u) {
      setRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("full_name, phone").eq("id", u.id).maybeSingle(),
    ]);
    const list = (roles ?? []).map((r) => r.role as Role);
    setRole(list.includes("professional") ? "professional" : list.length ? "client" : null);
    setProfile(prof ?? null);
    setLoading(false);
  };

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getUser().then(({ data }) => load(data.user));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        profile,
        loading,
        refresh: async () => {
          const { data } = await supabase.auth.getUser();
          await load(data.user);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
