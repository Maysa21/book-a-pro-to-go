import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer, useRef, useState } from "react";
import { Plus, Trash2, Eye, Save, Clock3, Store, Sparkles, ImagePlus, ArrowLeft, ChevronRight } from "lucide-react";
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
import { BusinessPhoto } from "@/components/BusinessPhoto";
import { removeBusinessPhoto, uploadBusinessPhoto, validateBusinessPhoto } from "@/lib/business-photos";
import { studioNavigation } from "@/lib/studio-navigation";

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
  photo_path: string | null;
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
  photo_path: null,
};

function StudioPage() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();
  const [view, dispatch] = useReducer(studioNavigation, "overview");
  const [form, setForm] = useState<Biz>(empty);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
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
      setForm({
        name: biz.name, category: biz.category, location: biz.location, bio: biz.bio,
        opens_at: biz.opens_at.slice(0, 5), closes_at: biz.closes_at.slice(0, 5),
        days: biz.days, slot_interval: biz.slot_interval, emoji: biz.emoji,
        published: biz.published, photo_path: biz.photo_path,
      });
  }, [biz]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

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
    let uploaded: string | null = null;
    try {
      if (photo) uploaded = await uploadBusinessPhoto(user.id, photo);
      const payload = { ...form, photo_path: uploaded ?? form.photo_path, owner_id: user.id };
      const { error } = biz
        ? await supabase.from("businesses").update(payload).eq("id", biz.id).eq("owner_id", user.id).select("id").single()
        : await supabase.from("businesses").insert(payload).select("id").single();
      if (error) throw error;
      const oldPath = biz?.photo_path;
      setForm(payload);
      setPhoto(null);
      toast.success("Espaço salvo!");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-business"] }),
        qc.invalidateQueries({ queryKey: ["businesses"] }),
        qc.invalidateQueries({ queryKey: ["business"] }),
      ]);
      dispatch({ type: "saved", hasBusiness: true });
      if (oldPath && oldPath !== payload.photo_path) {
        await removeBusinessPhoto(oldPath).catch(() => {});
      }
    } catch (error) {
      if (uploaded) await removeBusinessPhoto(uploaded).catch(() => {});
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o espaço. Tente novamente.");
    } finally {
      setSaving(false);
    }
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

  if (view === "overview") {
    return (
      <main className="min-w-0 px-5 py-6">
        <h1 className="text-3xl font-semibold">Meu espaço</h1>
        {biz ? (
          <Button type="button" variant="outline" className="mt-6 h-auto w-full min-w-0 flex-col items-stretch gap-4 whitespace-normal rounded-lg p-4 text-left"
            onClick={() => dispatch({ type: "open", hasBusiness: true })} aria-label={`Abrir ${biz.name}`}>
            <BusinessPhoto path={biz.photo_path} name={biz.name} emoji={biz.emoji} />
            <span className="flex min-w-0 items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block break-words text-xl font-semibold">{biz.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{biz.category}</span>
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </span>
          </Button>
        ) : (
          <Button type="button" className="mt-6 h-12 w-full" onClick={() => {
            setForm(empty); setPhoto(null);
            dispatch({ type: "create", hasBusiness: false });
          }}><Plus /> Criar espaço</Button>
        )}
      </main>
    );
  }

  return (
    <main className="min-w-0 px-5 py-6">
      <Button type="button" variant="ghost" size="sm" className="mb-4" disabled={saving || adding}
        onClick={() => { setPhoto(null); dispatch({ type: "back", hasBusiness: !!biz }); }}><ArrowLeft /> Voltar</Button>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="min-w-0 break-words text-3xl font-semibold">{view === "create" ? "Criar espaço" : biz?.name ?? "Meu espaço"}</h1>
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
          <div className="min-w-0 space-y-3">
            <Label htmlFor="biz-photo">Foto do estabelecimento</Label>
            <BusinessPhoto path={form.photo_path} preview={preview} name={form.name} emoji={form.emoji} />
            <input ref={photoInput} id="biz-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try { validateBusinessPhoto(file); setPhoto(file); }
                catch (error) { toast.error(error instanceof Error ? error.message : "Foto inválida."); }
              }} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={saving} className="min-w-0 flex-1" onClick={() => photoInput.current?.click()}>
                <ImagePlus /> {photo || form.photo_path ? "Trocar foto" : "Adicionar foto"}
              </Button>
              {(photo || form.photo_path) && <Button type="button" variant="outline" size="icon" disabled={saving} aria-label="Remover foto" title="Remover foto"
                onClick={() => { setPhoto(null); setForm({ ...form, photo_path: null }); }}><Trash2 /></Button>}
            </div>
          </div>
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

      {biz && view === "details" && <section className="min-w-0 border-t border-border py-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="size-5 text-primary" />
          Serviços
        </h2>
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
      </section>}
    </main>
  );
}
