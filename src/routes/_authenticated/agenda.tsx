import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarX, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, isoDate } from "@/lib/slots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Minha agenda — Agende Já" },
      { name: "description", content: "Seus próximos agendamentos." },
      { property: "og:title", content: "Minha agenda — Agende Já" },
      { property: "og:description", content: "Seus próximos agendamentos." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"next" | "past">("next");
  const isPro = role === "professional";

  const { data = [], isLoading } = useQuery({
    queryKey: ["bookings", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async () => {
      let q = supabase.from("bookings").select("*, businesses(id, name, emoji, owner_id)").order("date").order("time");
      if (!isPro) q = q.eq("client_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      const ids = [...new Set(data.map((b) => b.client_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
        : { data: [] };
      return data.map((b) => ({ ...b, client: profs?.find((p) => p.id === b.client_id) }));
    },
  });

  const today = isoDate(new Date());
  const list = data.filter((b) => (tab === "next" ? b.date >= today && b.status === "confirmed" : b.date < today || b.status !== "confirmed"));
  const revenue = data.filter((b) => b.status !== "cancelled" && b.date === today).reduce((s, b) => s + Number(b.price), 0);

  const setStatus = async (id: string, status: "cancelled" | "done") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "cancelled" ? "Agendamento cancelado" : "Marcado como concluído");
    qc.invalidateQueries({ queryKey: ["bookings"] });
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-semibold">{isPro ? "Agenda do espaço" : "Meus agendamentos"}</h1>
      {isPro && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Hoje" value={String(data.filter((b) => b.date === today && b.status === "confirmed").length)} />
          <Stat label="Próximos" value={String(data.filter((b) => b.date >= today && b.status === "confirmed").length)} />
          <Stat label="Faturamento hoje" value={brl(revenue)} />
        </div>
      )}
      <div className="mt-8 inline-flex rounded-full bg-muted p-1">
        {(["next", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-5 py-2 text-sm font-semibold", tab === t ? "bg-card shadow-soft" : "text-muted-foreground")}>
            {t === "next" ? "Próximos" : "Histórico"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {!isLoading && list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <CalendarX className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Nada por aqui.</p>
            {!isPro && <Button asChild variant="hero" className="mt-4"><Link to="/">Agendar agora</Link></Button>}
          </div>
        )}
        {list.map((b) => {
          const d = new Date(b.date + "T12:00");
          return (
            <article key={b.id} className="flex animate-rise flex-wrap items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="grid w-16 place-items-center rounded-2xl bg-accent py-2 text-accent-foreground">
                <span className="text-xs uppercase">{d.toLocaleDateString("pt-BR", { month: "short" })}</span>
                <span className="font-display text-2xl font-semibold">{d.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{b.service_name} · {b.time.slice(0, 5)}</p>
                <p className="text-sm text-muted-foreground">
                  {isPro ? `${b.client?.full_name || "Cliente"}${b.client?.phone ? " · " + b.client.phone : ""}` : `${b.businesses?.emoji} ${b.businesses?.name}`} · {b.duration} min · {brl(Number(b.price))}
                </p>
                {b.notes && <p className="mt-1 text-sm italic text-muted-foreground">“{b.notes}”</p>}
                {b.status !== "confirmed" && (
                  <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{b.status === "done" ? "Concluído" : "Cancelado"}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/chat" search={isPro ? { b: b.business_id, c: b.client_id } : { b: b.business_id }}><MessageCircle /> Chat</Link>
                </Button>
                {b.status === "confirmed" && isPro && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(b.id, "done")}><CheckCircle2 /> Concluir</Button>
                )}
                {b.status === "confirmed" && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "cancelled")}>Cancelar</Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-semibold">{value}</p>
  </div>
);
