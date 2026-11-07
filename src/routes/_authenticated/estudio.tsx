import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, WEEKDAYS } from "@/lib/slots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/estudio")({
  head: () => ({
    meta: [
      { title: "Meu espaço — AgendaFácil" },
      { name: "description", content: "Cadastre serviços e defina seus horários de atendimento." },
      { property: "og:title", content: "Meu espaço — AgendaFácil" },
      { property: "og:description", content: "Cadastre serviços e defina seus horários." },
    ],
  }),
  component: StudioPage,
});

const EMOJIS = ["✨", "💅", "💈", "🌿", "💆", "💇", "🧖", "💄"];
type Biz = { name: string; category: string; location: string; bio: string; opens_at: string; closes_at: string; days: number[]; slot_interval: number; emoji: string; published: boolean };
const empty: Biz = { name: "", category: "Beleza e estética", location: "", bio: "", opens_at: "09:00", closes_at: "18:00", days: [1, 2, 3, 4, 5, 6], slot_interval: 30, emoji: "✨", published: true };

function StudioPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Biz>(empty);
  const [svc, setSvc] = useState({ name: "", duration: "30", price: "" });

  const { data: biz, isLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*, services(*)").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (biz) setForm({ ...biz, opens_at: biz.opens_at.slice(0, 5), closes_at: biz.closes_at.slice(0, 5) });
  }, [biz]);

  if (role && role !== "professional")
    return <main className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">Esta área é para contas de profissional.</main>;
  if (isLoading) return <main className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Carregando…</main>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.closes_at <= form.opens_at) { toast.error("O horário de fechamento deve ser depois da abertura."); return; }
    const payload = { ...form, owner_id: user!.id };
    const { error } = biz
      ? await supabase.from("businesses").update(payload).eq("id", biz.id)
      : await supabase.from("businesses").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Espaço salvo!");
    qc.invalidateQueries({ queryKey: ["my-business"] });
    qc.invalidateQueries({ queryKey: ["businesses"] });
  };

  const addService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;
    const { error } = await supabase.from("services").insert({ business_id: biz.id, name: svc.name, duration: Number(svc.duration), price: Number(svc.price.replace(",", ".")) });
    if (error) { toast.error(error.message); return; }
    setSvc({ name: "", duration: "30", price: "" });
    toast.success("Serviço cadastrado");
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  const toggleService = async (id: string, active: boolean) => {
    await supabase.from("services").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };
  const removeService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Meu espaço</h1>
          <p className="text-muted-foreground">Seu perfil, serviços e horários de atendimento.</p>
        </div>
        {biz && (
          <Button asChild variant="outline"><Link to="/p/$id" params={{ id: biz.id }}><Eye /> Ver como cliente</Link></Button>
        )}
      </div>

      <form onSubmit={save} className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-soft md:grid-cols-2">
        <h2 className="text-2xl font-semibold md:col-span-2">Perfil e horários</h2>
        <div className="space-y-1.5"><Label>Nome do espaço</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Endereço / bairro</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Ícone</Label>
          <div className="flex gap-1.5">
            {EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => setForm({ ...form, emoji: em })} className={cn("grid size-10 place-items-center rounded-xl text-xl", form.emoji === em ? "bg-accent ring-2 ring-primary" : "bg-muted")}>{em}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Sobre</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Dias de atendimento</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => {
              const on = form.days.includes(i);
              return (
                <button type="button" key={d} onClick={() => setForm({ ...form, days: on ? form.days.filter((x) => x !== i) : [...form.days, i].sort() })}
                  className={cn("rounded-full border-2 px-4 py-2 text-sm font-semibold", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{d}</button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <div className="space-y-1.5"><Label>Abre às</Label><Input type="time" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Fecha às</Label><Input type="time" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Intervalo</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.slot_interval} onChange={(e) => setForm({ ...form, slot_interval: Number(e.target.value) })}>
              {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 md:col-span-2">
          <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
          <span className="text-sm">Visível para clientes</span>
        </label>
        <Button type="submit" variant="hero" size="lg" className="md:col-span-2">{biz ? "Salvar alterações" : "Criar meu espaço"}</Button>
      </form>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Serviços</h2>
        {!biz ? (
          <p className="mt-3 text-muted-foreground">Crie seu espaço acima para cadastrar serviços.</p>
        ) : (
          <>
            <form onSubmit={addService} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">
              <Input required placeholder="Nome do serviço" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
              <Input required type="number" min={5} step={5} placeholder="Min" value={svc.duration} onChange={(e) => setSvc({ ...svc, duration: e.target.value })} />
              <Input required inputMode="decimal" placeholder="Preço (R$)" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value })} />
              <Button type="submit"><Plus /> Adicionar</Button>
            </form>
            <ul className="mt-5 divide-y divide-border">
              {biz.services.map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-3">
                  <div className={cn("flex-1", !s.active && "opacity-50")}>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.duration} min · {brl(Number(s.price))}</p>
                  </div>
                  <Switch checked={s.active} onCheckedChange={(v) => toggleService(s.id, v)} aria-label="Ativo" />
                  <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => removeService(s.id)}><Trash2 /></Button>
                </li>
              ))}
              {biz.services.length === 0 && <li className="py-4 text-muted-foreground">Nenhum serviço ainda.</li>}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
