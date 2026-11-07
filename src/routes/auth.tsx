import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — AgendaFácil" },
      { name: "description", content: "Crie sua conta de cliente ou profissional no AgendaFácil." },
      { property: "og:title", content: "Entrar — AgendaFácil" },
      { property: "og:description", content: "Crie sua conta de cliente ou profissional." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [type, setType] = useState<"client" | "professional">("client");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        navigate({ to: "/agenda" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.name, phone: form.phone, account_type: type },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: type === "professional" ? "/estudio" : "/" });
        else setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] bg-gradient-hero px-4 py-12">
      <div className="mx-auto max-w-md animate-rise rounded-3xl border border-border bg-card p-8 shadow-soft">
        {sent ? (
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Confira seu e-mail</h1>
            <p className="mt-3 text-muted-foreground">
              Enviamos um link para <strong>{form.email}</strong>. Clique nele para ativar sua conta.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{mode === "in" ? "Bem-vinda de volta" : "Criar conta"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "in" ? "Entre para ver sua agenda." : "Escolha como você vai usar o app."}
            </p>

            {mode === "up" && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(
                  [
                    ["client", User, "Sou cliente", "Quero agendar"],
                    ["professional", Briefcase, "Sou profissional", "Quero atender"],
                  ] as const
                ).map(([v, Icon, t, d]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setType(v)}
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-all",
                      type === v ? "border-primary bg-accent shadow-glow" : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className="size-5 text-primary" />
                    <p className="mt-2 font-semibold">{t}</p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "up" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(85) 90000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar minha conta"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "in" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
              <button className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
