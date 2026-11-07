import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarHeart, LogOut, MessageCircle, Store, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const link =
    "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
  const active = { className: "bg-accent text-accent-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-warm text-primary-foreground shadow-glow">
            <CalendarHeart className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold">AgendaFácil</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" className={link} activeProps={active} activeOptions={{ exact: true }}>
            <Compass className="size-4" />
            <span className="hidden sm:inline">Explorar</span>
          </Link>
          {user && (
            <>
              <Link to="/agenda" className={link} activeProps={active}>
                <CalendarHeart className="size-4" />
                <span className="hidden sm:inline">Agenda</span>
              </Link>
              {role === "professional" && (
                <Link to="/estudio" className={link} activeProps={active}>
                  <Store className="size-4" />
                  <span className="hidden sm:inline">Meu espaço</span>
                </Link>
              )}
              <Link to="/chat" className={link} activeProps={active}>
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            </>
          )}
        </nav>
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold leading-tight">{profile?.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">
                {role === "professional" ? "Profissional" : "Cliente"}
              </p>
            </div>
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
