import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Clock, MapPin, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { availableSlots, brl, isoDate, WEEKDAYS } from "@/lib/slots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Agendar horário — AgendaFácil" },
      { name: "description", content: "Escolha o serviço, o dia e um horário livre." },
      { property: "og:title", content: "Agendar horário — AgendaFácil" },
      { property: "og:description", content: "Escolha o serviço, o dia e um horário livre." },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: biz } = useQuery({
    queryKey: ["business", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*, services(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const services = (biz?.services ?? []).filter((s) => s.active);
  const service = services.find((s) => s.id === serviceId) ?? null;

  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
    }
    return out;
  }, []);

  const { data: busy = [], refetch } = useQuery({
    queryKey: ["busy", id, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_busy_slots", { _business_id: id, _date: date });
      if (error) throw error;
      return data;
    },
  });

  const dayOpen = biz ? biz.days.includes(new Date(date + "T12:00").getDay()) : false;
  const now = new Date();
  const slots =
    biz && service && dayOpen
      ? availableSlots({
          opensAt: biz.opens_at.slice(0, 5),
          closesAt: biz.closes_at.slice(0, 5),
          interval: biz.slot_interval,
          duration: service.duration,
          busy,
          nowMinutes: date === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : null,
        })
      : [];

  const book = async () => {
    if (!user || !service || !time || !biz) return;
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      business_id: biz.id,
      service_id: service.id,
      client_id: user.id,
      service_name: service.name,
      duration: service.duration,
      price: service.price,
      date,
      time,
      notes,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      refetch();
      setTime(null);
      return;
    }
    toast.success("Agendamento confirmado!");
    navigate({ to: "/agenda" });
  };

  if (!biz) return <main className="mx-auto  px-4 py-6 text-muted-foreground">Carregando…</main>;

  return (
    <main className="mx-auto grid  gap-8 px-4 py-6">
      <div className="min-w-0 space-y-8">
        <header className="flex animate-rise items-start gap-5 rounded-3xl bg-gradient-hero p-6">
          <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-card text-5xl shadow-soft">{biz.emoji}</span>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{biz.name}</h1>
            <p className="text-muted-foreground">{biz.category}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="size-4 fill-primary text-primary" /> {Number(biz.rating).toFixed(1)}</span>
              {biz.location && <span className="flex items-center gap-1"><MapPin className="size-4" /> {biz.location}</span>}
              <span className="flex items-center gap-1"><Clock className="size-4" /> {biz.opens_at.slice(0, 5)}–{biz.closes_at.slice(0, 5)} · {biz.days.map((d) => WEEKDAYS[d]).join(", ")}</span>
            </div>
            {biz.bio && <p className="mt-3">{biz.bio}</p>}
          </div>
          {user && role === "client" && biz.owner_id && (
            <Button asChild variant="urgent" size="sm">
              <Link to="/chat" search={{ b: biz.id }}><MessageCircle /> Chat</Link>
            </Button>
          )}
        </header>

        <section>
          <h2 className="text-2xl font-semibold">1. Escolha o serviço</h2>
          <div className="mt-4 grid gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setTime(null); }}
                className={cn(
                  "flex items-center justify-between rounded-2xl border-2 bg-card p-4 text-left transition-all",
                  serviceId === s.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40",
                )}
              >
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.duration} min</p>
                </div>
                <span className="font-display text-lg font-semibold">{brl(Number(s.price))}</span>
              </button>
            ))}
            {services.length === 0 && <p className="text-muted-foreground">Nenhum serviço cadastrado ainda.</p>}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">2. Escolha o dia</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const iso = isoDate(d);
              const open = biz.days.includes(d.getDay());
              return (
                <button
                  key={iso}
                  disabled={!open}
                  onClick={() => { setDate(iso); setTime(null); }}
                  className={cn(
                    "flex w-16 shrink-0 flex-col items-center rounded-2xl border-2 py-3 transition-all disabled:opacity-35",
                    date === iso ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="text-xs uppercase">{WEEKDAYS[d.getDay()]}</span>
                  <span className="font-display text-2xl font-semibold">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">3. Horários disponíveis</h2>
          {!service ? (
            <p className="mt-3 text-muted-foreground">Escolha um serviço para ver os horários.</p>
          ) : !dayOpen ? (
            <p className="mt-3 text-muted-foreground">Fechado neste dia.</p>
          ) : slots.length === 0 ? (
            <p className="mt-3 text-muted-foreground">Sem horários livres neste dia. Tente outro.</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={cn(
                    "rounded-xl border-2 py-2.5 text-sm font-semibold transition-all",
                    time === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-soft lg:sticky lg:top-24">
        <h3 className="text-xl font-semibold">Resumo</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <Row k="Serviço" v={service?.name ?? "—"} />
          <Row k="Dia" v={new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} />
          <Row k="Horário" v={time ?? "—"} />
          <Row k="Duração" v={service ? `${service.duration} min` : "—"} />
        </dl>
        <div className="my-5 border-t border-dashed border-border" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-semibold">{service ? brl(Number(service.price)) : "—"}</span>
        </div>
        <Textarea className="mt-5" placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {!user ? (
          <Button asChild variant="hero" size="lg" className="mt-4 w-full">
            <Link to="/auth">Entre para agendar</Link>
          </Button>
        ) : role === "professional" ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">Agendamentos são feitos por contas de cliente.</p>
        ) : (
          <Button variant="hero" size="lg" className="mt-4 w-full" disabled={!service || !time || saving} onClick={book}>
            <Check /> {saving ? "Confirmando…" : "Confirmar agendamento"}
          </Button>
        )}
      </aside>
    </main>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className="text-right font-medium capitalize">{v}</dd>
  </div>
);
