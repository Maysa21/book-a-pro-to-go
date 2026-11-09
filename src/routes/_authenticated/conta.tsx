import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKeyhole, Save, UserRound, LoaderCircle, Store } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { changeAccountType, saveAccountProfile, type AccountType } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — AgendaFácil" },
      { name: "description", content: "Gerencie seus dados pessoais e sua senha no AgendaFácil." },
      { property: "og:title", content: "Minha conta — AgendaFácil" },
      { property: "og:description", content: "Gerencie seus dados pessoais e sua senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, role, loading, refresh } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [switching, setSwitching] = useState<AccountType | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (profile) setForm({ name: profile.full_name, phone: profile.phone });
  }, [profile]);

  if (loading || !user)
    return (
      <main className="p-5 text-muted-foreground" aria-busy="true">
        Carregando sua conta…
      </main>
    );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveAccountProfile(user.id, form.name, form.phone);
      await refresh();
      toast.success("Dados da conta salvos!");
    } catch {
      toast.error("Não foi possível salvar seus dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const switchType = async (nextType: AccountType) => {
    if (switching || nextType === role) return;
    setSwitching(nextType);
    try {
      await changeAccountType(nextType);
      await refresh();
      await queryClient.invalidateQueries();
      toast.success(nextType === "professional" ? "Conta alterada para profissional!" : "Conta alterada para cliente!");
    } catch {
      toast.error("Não foi possível alterar o tipo de conta. Tente novamente.");
    } finally {
      setSwitching(null);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      toast.success("Senha alterada!");
    } catch {
      toast.error("Não foi possível alterar a senha. Entre novamente e tente outra vez.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <main className="min-w-0 px-5 py-6">
      <h1 className="text-3xl font-semibold">Minha conta</h1>
      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border pb-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <UserRound className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="break-words font-semibold">{profile?.full_name || "Minha conta"}</p>
          <p className="text-sm text-muted-foreground">
            {role === "professional" ? "Profissional" : "Cliente"}
          </p>
        </div>
      </div>
      <section className="space-y-4 border-b border-border py-6" aria-labelledby="account-type-title">
        <h2 id="account-type-title" className="text-xl font-semibold">Tipo de conta</h2>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de conta">
          <Button
            type="button"
            variant={role === "client" ? "default" : "outline"}
            aria-pressed={role === "client"}
            disabled={switching !== null}
            className="h-12 min-w-0"
            onClick={() => switchType("client")}
          >
            {switching === "client" ? <LoaderCircle className="animate-spin" /> : <UserRound />}
            Cliente
          </Button>
          <Button
            type="button"
            variant={role === "professional" ? "default" : "outline"}
            aria-pressed={role === "professional"}
            disabled={switching !== null}
            className="h-12 min-w-0"
            onClick={() => switchType("professional")}
          >
            {switching === "professional" ? <LoaderCircle className="animate-spin" /> : <Store />}
            Profissional
          </Button>
        </div>
      </section>
      <form onSubmit={save} className="space-y-5 py-6">
        <h2 className="text-xl font-semibold">Dados pessoais</h2>
        <div className="space-y-2">
          <Label htmlFor="account-name">Nome completo</Label>
          <Input
            id="account-name"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-phone">Telefone</Label>
          <Input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-email">E-mail de acesso</Label>
          <Input
            id="account-email"
            type="email"
            readOnly
            value={user.email || ""}
            className="h-11 bg-muted text-muted-foreground"
          />
        </div>
        <Button type="submit" disabled={saving} className="h-11 w-full">
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
          {saving ? "Salvando…" : "Salvar dados"}
        </Button>
      </form>
      <form onSubmit={changePassword} className="space-y-5 border-t border-border py-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <LockKeyhole className="size-5 text-primary" />
          Segurança
        </h2>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" variant="outline" disabled={changing} className="h-11 w-full">
          {changing ? "Alterando…" : "Alterar senha"}
        </Button>
      </form>
    </main>
  );
}
