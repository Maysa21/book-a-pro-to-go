import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import loginBg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const [mode, setMode] = useState<"in" | "up">("in");
  const [type, setType] = useState<"client" | "professional">("client");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

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
        navigate({ to: "/" });
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
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-6">
      <img
        src={loginBg}
        alt=""
        aria-hidden
        width={1024}
        height={1536}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-scrim" aria-hidden />

      <div className="relative w-full max-w-sm animate-rise">
        <div className="rounded-3xl bg-card/85 p-6 shadow-soft backdrop-blur-xl">
          <div className="mb-5 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-2xl bg-gradient-warm text-primary-foreground shadow-glow">
              <CalendarHeart className="size-5" />
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold">AgendaFácil</h1>
            {mode === "in" && (
              <p className="mt-1 text-sm text-muted-foreground">Entre para ver sua agenda.</p>
            )}
          </div>
          {sent ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl font-semibold">Confira seu e-mail</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Enviamos um link para <strong>{form.email}</strong>. Clique nele para ativar sua conta.
              </p>
            </div>
          ) : (
            <>
              {mode === "up" && (
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["client", "Sou cliente"],
                      ["professional", "Sou profissional"],
                    ] as const
                  ).map(([v, t]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setType(v)}
                      className={cn(
                        "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                        type === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={submit} className="space-y-3">
                {mode === "up" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="name" className="px-1 text-xs text-muted-foreground">
                        Nome completo
                      </Label>
                      <Input
                        id="name"
                        required
                        value={form.name}
                        onChange={set("name")}
                        className="h-10 rounded-xl bg-background/85 shadow-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="px-1 text-xs text-muted-foreground">
                        Telefone
                      </Label>
                      <Input
                        id="phone"
                        placeholder="(85) 90000-0000"
                        value={form.phone}
                        onChange={set("phone")}
                        className="h-10 rounded-xl bg-background/85 shadow-none"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label htmlFor="email" className="px-1 text-xs text-muted-foreground">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    className="h-11 rounded-xl bg-background/85 shadow-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="px-1 text-xs text-muted-foreground">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={6}
                    required
                    value={form.password}
                    onChange={set("password")}
                    className="h-11 rounded-xl bg-background/85 shadow-none"
                  />
                </div>
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="mt-3 h-11 w-full"
                  disabled={busy}
                >
                  {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar minha conta"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "in" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
                <button
                  className="font-semibold text-primary"
                  onClick={() => setMode(mode === "in" ? "up" : "in")}
                >
                  {mode === "in" ? "Cadastre-se" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
