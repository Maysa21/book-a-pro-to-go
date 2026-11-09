import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, Save, Clock3, Store, Sparkles } from "lucide-react";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Meu espaço — AgendaFácil" },
      { name: "description", content: "Cadastre serviços e defina seus horários de atendimento." },
      { property: "og:title", content: "Meu espaço — AgendaFácil" },
      { property: "og:description", content: "Cadastre serviços e defina seus horários." },
    ],
  }),
  component: StudioPage,
});

const EMOJIS = ["✨", "💅", "💈", "🌿", "💆", "💇", "🧖", "💄"];
type Biz = {
  name: string;
  category: string;
  location: string;
  bio: string;
  opens_at: string;
  closes_at: string;
  days: number[];
  slot_interval: number;
  emoji: string;
  published: boolean;
};
const empty: Biz = {
  name: "",
  category: "Beleza e estética",
  location: "",
  bio: "",
  opens_at: "09:00",
  closes_at: "18:00",
  days: [1, 2, 3, 4, 5, 6],
  slot_interval: 30,
  emoji: "✨",
  published: true,
};

function StudioPage() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Biz>(empty);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [svc, setSvc] = useState({ name: "", duration: "30", price: "" });

  const { data: biz, isLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    enabled: !!user && role === "professional",
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("businesses")
        .select("*, services(*)")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (biz)
      setForm({ ...biz, opens_at: biz.opens_at.slice(0, 5), closes_at: biz.closes_at.slice(0, 5) });
  }, [biz]);

  if (loading) return <main className="p-5 text-muted-foreground">Carregando…</main>;
  if (role !== "professional")
    return (
      <main className="mx-auto max-w-xl px-4 py-6 text-center text-muted-foreground">
        Esta área é para contas de profissional.
      </main>
    );
  if (isLoading)
    return <main className="mx-auto max-w-4xl px-4 py-6 text-muted-foreground">Carregando…</main>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.closes_at <= form.opens_at) {
      toast.error("O horário de fechamento deve ser depois da abertura.");
      return;
    }
    if (!user) return;
    setSaving(true);
    const payload = { ...form, owner_id: user.id };
    const { error } = biz
      ? await supabase.from("businesses").update(payload).eq("id", biz.id)
      : await supabase.from("businesses").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Espaço salvo!");
    qc.invalidateQueries({ queryKey: ["my-business"] });
    qc.invalidateQueries({ queryKey: ["businesses"] });
  };

  const addService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;
    setAdding(true);
    const { error } = await supabase
      .from("services")
      .insert({
        business_id: biz.id,
        name: svc.name,
        duration: Number(svc.duration),
        price: Number(svc.price.replace(",", ".")),
      });
    if (error) {
      setAdding(false);
      toast.error(error.message);
      return;
    }
    setAdding(false);
    setSvc({ name: "", duration: "30", price: "" });
    toast.success("Serviço cadastrado");
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  const toggleService = async (id: string, active: boolean) => {
    const { error } = await supabase.from("services").update({ active }).eq("id", id);
    if (error) {
      toast.error("Não foi possível alterar o serviço.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };
  const removeService = async (id: string) => {
    if (!window.confirm("Excluir este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir o serviço. Ele pode ter agendamentos vinculados.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  return (
    <main className="min-w-0 px-5 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="min-w-0 text-3xl font-semibold">Meu espaço</h1>
        {biz && (
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link
              to="/p/$id"
              params={{ id: biz.id }}
              aria-label="Ver como cliente"
              title="Ver como cliente"
            >
              <Eye />
            </Link>
          </Button>
        )}
      </div>

      <form onSubmit={save} className="min-w-0">
        <section className="space-y-5 py-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Store className="size-5 text-primary" />
            Perfil do espaço
          </h2>
          <div className="space-y-2">
            <Label htmlFor="biz-name">Nome do espaço</Label>
            <Input
              id="biz-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-category">Categoria</Label>
            <Input
              id="biz-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-location">Endereço / bairro</Label>
            <Input
              id="biz-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="h-11"
            />
          </div>
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium">Ícone do espaço</legend>
            <div className="grid grid-cols-4 gap-2 min-[380px]:grid-cols-8">
              {EMOJIS.map((em) => (
                <Button
                  type="button"
                  key={em}
                  variant="ghost"
                  aria-label={`Ícone ${em}`}
                  aria-pressed={form.emoji === em}
                  onClick={() => setForm({ ...form, emoji: em })}
                  className={cn(
                    "h-11 w-full min-w-0 rounded-lg px-0 text-xl",
                    form.emoji === em ? "bg-accent ring-2 ring-primary" : "bg-muted",
                  )}
                >
                  {em}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="biz-bio">Sobre o espaço</Label>
            <Textarea
              id="biz-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary px-3 py-4">
            <Label htmlFor="biz-published" className="min-w-0 text-secondary-foreground">
              Visível para clientes
            </Label>
            <Switch
              id="biz-published"
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
          </div>
        </section>
        <section className="space-y-5 border-t border-border py-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Clock3 className="size-5 text-primary" />
            Horários de atendimento
          </h2>
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium">Dias de atendimento</legend>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => {
                const on = form.days.includes(i);
                return (
                  <Button
                    type="button"
                    key={d}
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    onClick={() =>
                      setForm({
                        ...form,
                        days: on ? form.days.filter((x) => x !== i) : [...form.days, i].sort(),
                      })
                    }
                    className="h-11 min-w-0 rounded-lg px-0 text-xs"
                  >
                    {d}
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="biz-open">Abre às</Label>
              <Input
                id="biz-open"
                required
                type="time"
                value={form.opens_at}
                onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                className="h-11 min-w-0 max-w-full"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="biz-close">Fecha às</Label>
              <Input
                id="biz-close"
                required
                type="time"
                value={form.closes_at}
                onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                className="h-11 min-w-0 max-w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-interval">Intervalo entre horários</Label>
            <select
              id="biz-interval"
              className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base"
              value={form.slot_interval}
              onChange={(e) => setForm({ ...form, slot_interval: Number(e.target.value) })}
            >
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={saving} className="h-11 w-full">
            <Save />
            {saving ? "Salvando…" : biz ? "Salvar alterações" : "Criar meu espaço"}
          </Button>
        </section>
      </form>

      <section className="min-w-0 border-t border-border py-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="size-5 text-primary" />
          Serviços
        </h2>
        {!biz ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Crie seu espaço para cadastrar serviços.
          </p>
        ) : (
          <>
            <form onSubmit={addService} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="svc-name">Nome do serviço</Label>
                <Input
                  id="svc-name"
                  required
                  value={svc.name}
                  onChange={(e) => setSvc({ ...svc, name: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="svc-duration">Duração (min)</Label>
                  <Input
                    id="svc-duration"
                    required
                    type="number"
                    min={5}
                    step={5}
                    value={svc.duration}
                    onChange={(e) => setSvc({ ...svc, duration: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="svc-price">Preço (R$)</Label>
                  <Input
                    id="svc-price"
                    required
                    inputMode="decimal"
                    value={svc.price}
                    onChange={(e) => setSvc({ ...svc, price: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={adding} className="h-11 w-full">
                <Plus />
                {adding ? "Adicionando…" : "Adicionar serviço"}
              </Button>
            </form>
            <ul className="mt-6 divide-y divide-border">
              {biz.services.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4"
                >
                  <div className={cn("min-w-0", !s.active && "opacity-50")}>
                    <p className="break-words font-semibold">{s.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.duration} min · {brl(Number(s.price))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={s.active}
                      onCheckedChange={(v) => toggleService(s.id, v)}
                      aria-label={`Ativar ${s.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${s.name}`}
                      title="Excluir serviço"
                      onClick={() => removeService(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
              {biz.services.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">Nenhum serviço cadastrado.</li>
              )}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
