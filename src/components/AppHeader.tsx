import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarHeart, LogOut, MessageCircle, Store, Compass, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const name = profile?.full_name || user?.email || "";
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-warm text-primary-foreground shadow-glow">
            <CalendarHeart className="size-4" />
          </span>
          {user ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">
                Olá, {name.split(" ")[0]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {role === "professional" ? "Profissional" : "Cliente"}
              </span>
            </span>
          ) : (
            <span className="truncate font-display text-lg font-semibold">AgendaFácil</span>
          )}
        </Link>
        {user ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full bg-accent text-accent-foreground"
            >
              <Link to="/conta" aria-label="Gerenciar minha conta" title="Gerenciar minha conta">
                {initial}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut />
            </Button>
          </div>
        ) : (
          <Button asChild variant="hero" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function BottomNav() {
  const { user, role } = useAuth();
  const item =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors";
  const active = { className: "text-primary" };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="flex h-16 items-stretch">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}>
          <Compass className="size-6" />
          Início
        </Link>
        {user ? (
          <>
            <Link to="/agenda" className={item} activeProps={active}>
              <CalendarHeart className="size-6" />
              Agenda
            </Link>
            <Link to="/chat" className={item} activeProps={active}>
              <MessageCircle className="size-6" />
              Chat
            </Link>
            {role === "professional" && (
              <Link to="/estudio" className={item} activeProps={active}>
                <Store className="size-6" />
                Meu espaço
              </Link>
            )}
            <Link to="/conta" className={item} activeProps={active}>
              <UserRound className="size-6" />
              Conta
            </Link>
          </>
        ) : (
          <Link to="/auth" className={item} activeProps={active}>
            <UserRound className="size-6" />
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
