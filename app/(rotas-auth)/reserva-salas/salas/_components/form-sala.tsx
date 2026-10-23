"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { Layout } from "@prisma/client";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, label: "Dados da sala" },
  { id: 1, label: "Mobiliário" },
  { id: 2, label: "Mídia" },
  { id: 3, label: "Fotos do layout" },
] as const;

const formSchema = z.object({
  nome: z.string().min(1, "Nome da sala é obrigatório"),
  andar: z.string().optional(),
  numero: z.string().optional(),
  lotacao: z.number().int().positive().optional(),
  layout: z.enum(["FIXO", "MOVEL"]).optional(),
  mobiliarios: z.array(
    z.object({
      nome: z.string(),
      quantidade: z.coerce.number().int().positive(),
    }),
  ),
  midias: z.array(
    z.object({
      nome: z.string(),
      quantidade: z.coerce.number().int().positive(),
    }),
  ),
});

type FormSalaValues = {
  nome: string;
  andar?: string;
  numero?: string;
  lotacao?: number;
  layout?: "FIXO" | "MOVEL";
  mobiliarios: { nome: string; quantidade: number }[];
  midias: { nome: string; quantidade: number }[];
};

export type SalaLayoutFotoRow = {
  id: string;
  descricao: string;
  imagemUrl: string;
  ordem: number;
};

export type SalaRow = {
  id: string;
  nome: string;
  andar: string | null;
  numero: string | null;
  lotacao: number | null;
  layout: Layout | null;
  layoutFotos: SalaLayoutFotoRow[];
  mobiliarios: { id: string; nome: string; quantidade: number }[];
  midias: { id: string; nome: string; quantidade: number }[];
  ativo: boolean;
};

type LayoutFotoLinha = {
  key: string;
  id?: string;
  descricao: string;
  imagemUrl?: string | null;
  file?: File | null;
  objectUrl?: string | null;
};

interface FormSalaProps {
  isUpdating: boolean;
  sala?: Partial<SalaRow>;
  /** Classes extras no elemento `form` (ex.: flex-1 e overflow no modal). */
  className?: string;
}

function filtrarItens(
  lista: { nome: string; quantidade: number }[],
): { nome: string; quantidade: number }[] {
  return lista
    .map((x) => ({ nome: x.nome.trim(), quantidade: x.quantidade }))
    .filter((x) => x.nome.length > 0 && x.quantidade > 0);
}

function linhasRelevantes(linhas: LayoutFotoLinha[]) {
  return linhas.filter((r) => r.descricao.trim() || r.file || r.imagemUrl);
}

function validarLayoutMovel(linhas: LayoutFotoLinha[]): boolean {
  const rel = linhasRelevantes(linhas);
  if (rel.length === 0) {
    toast.error("Layout móvel exige pelo menos uma foto com tipo e imagem.");
    return false;
  }
  for (const r of rel) {
    if (!r.descricao.trim() || (!r.file && !r.imagemUrl)) {
      toast.error(
        "Cada tipo de layout precisa de nome e imagem (ou remova linhas vazias).",
      );
      return false;
    }
  }
  return true;
}

export default function FormSala({
  isUpdating,
  sala,
  className: formClassName,
}: FormSalaProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const descricaoInicialRef = useRef<Record<string, string>>({});
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const [layoutFotosLocal, setLayoutFotosLocal] = useState<LayoutFotoLinha[]>(
    () => {
      const fotos = sala?.layoutFotos ?? [];
      const m: Record<string, string> = {};
      for (const f of fotos) {
        m[f.id] = f.descricao;
      }
      descricaoInicialRef.current = m;
      return fotos.map((f) => ({
        key: f.id,
        id: f.id,
        descricao: f.descricao,
        imagemUrl: f.imagemUrl,
      }));
    },
  );

  const form = useForm<FormSalaValues>({
    resolver: zodResolver(formSchema) as Resolver<FormSalaValues>,
    defaultValues: {
      nome: sala?.nome ?? "",
      andar: sala?.andar ?? "",
      numero: sala?.numero ?? "",
      lotacao: sala?.lotacao ?? undefined,
      layout: sala?.layout ?? undefined,
      mobiliarios:
        sala?.mobiliarios?.map((x) => ({
          nome: x.nome,
          quantidade: x.quantidade,
        })) ?? [],
      midias:
        sala?.midias?.map((x) => ({
          nome: x.nome,
          quantidade: x.quantidade,
        })) ?? [],
    },
  });

  const layoutWatch = form.watch("layout");

  const {
    fields: fieldsMobiliarios,
    append: appendMobiliario,
    remove: removeMobiliario,
  } = useFieldArray({ control: form.control, name: "mobiliarios" });
  const {
    fields: fieldsMidias,
    append: appendMidia,
    remove: removeMidia,
  } = useFieldArray({ control: form.control, name: "midias" });

  useEffect(() => {
    return () => {
      for (const u of objectUrlsRef.current) {
        URL.revokeObjectURL(u);
      }
      objectUrlsRef.current.clear();
    };
  }, []);

  async function postLayoutFoto(
    salaId: string,
    file: File,
    descricao: string,
    replaceFotoId?: string,
  ): Promise<boolean> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("descricao", descricao.trim());
    if (replaceFotoId) fd.append("replaceFotoId", replaceFotoId);
    const res = await fetch(`/api/salas/${salaId}/layout-imagem`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Erro ao enviar foto do layout", { description: data.error });
      return false;
    }
    return true;
  }

  async function patchLayoutFotoDescricao(
    salaId: string,
    fotoId: string,
    descricao: string,
  ): Promise<boolean> {
    const res = await fetch(`/api/salas/${salaId}/layout-imagem/${fotoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: descricao.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Erro ao atualizar tipo de layout", {
        description: data.error,
      });
      return false;
    }
    return true;
  }

  async function deleteLayoutFotoApi(
    salaId: string,
    fotoId: string,
  ): Promise<boolean> {
    const res = await fetch(`/api/salas/${salaId}/layout-imagem/${fotoId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Erro ao remover foto", { description: data.error });
      return false;
    }
    return true;
  }

  function onFileChangeLinha(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const f = e.target.files?.[0];
    setLayoutFotosLocal((prev) => {
      const row = prev[index];
      if (!row) return prev;
      if (row.objectUrl) {
        URL.revokeObjectURL(row.objectUrl);
        objectUrlsRef.current.delete(row.objectUrl);
      }
      const next = [...prev];
      if (!f) {
        next[index] = { ...row, file: null, objectUrl: null };
        return next;
      }
      const ok = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ].includes(f.type);
      if (!ok) {
        toast.error("Use JPEG, PNG, WebP ou GIF.");
        e.target.value = "";
        return prev;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx. 5 MB).");
        e.target.value = "";
        return prev;
      }
      const objectUrl = URL.createObjectURL(f);
      objectUrlsRef.current.add(objectUrl);
      next[index] = {
        ...row,
        file: f,
        objectUrl,
      };
      return next;
    });
  }

  function appendLayoutFotoLinha() {
    setLayoutFotosLocal((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        descricao: "",
        imagemUrl: null,
        file: null,
        objectUrl: null,
      },
    ]);
  }

  async function removeLayoutFotoLinha(index: number) {
    const row = layoutFotosLocal[index];
    if (!row) return;
    if (row.objectUrl) {
      URL.revokeObjectURL(row.objectUrl);
      objectUrlsRef.current.delete(row.objectUrl);
    }
    if (row.id && sala?.id) {
      const ok = await deleteLayoutFotoApi(sala.id, row.id);
      if (!ok) return;
    }
    setLayoutFotosLocal((prev) => prev.filter((_, i) => i !== index));
    if (row.id) {
      const next = { ...descricaoInicialRef.current };
      delete next[row.id];
      descricaoInicialRef.current = next;
    }
  }

  async function sincronizarFotosLayout(
    salaId: string,
    layout: string | undefined,
  ) {
    if (layout !== "MOVEL") return true;
    const rel = linhasRelevantes(layoutFotosLocal);
    for (const r of rel) {
      if (r.file) {
        const replaceId = r.id ?? undefined;
        const ok = await postLayoutFoto(salaId, r.file, r.descricao, replaceId);
        if (!ok) return false;
        continue;
      }
      if (r.id) {
        const inicial = descricaoInicialRef.current[r.id];
        if (inicial !== undefined && r.descricao.trim() !== inicial) {
          const ok = await patchLayoutFotoDescricao(salaId, r.id, r.descricao);
          if (!ok) return false;
        }
      }
    }
    return true;
  }

  async function onSubmit(values: FormSalaValues) {
    const layout = values.layout;
    if (layout === "MOVEL" && !validarLayoutMovel(layoutFotosLocal)) {
      setStep(3);
      return;
    }

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          nome: values.nome.trim(),
          andar: values.andar?.trim() || null,
          numero: values.numero?.trim() || null,
          lotacao: values.lotacao ?? null,
          layout: values.layout?.trim() || null,
          mobiliarios: filtrarItens(values.mobiliarios),
          midias: filtrarItens(values.midias),
        };

        if (isUpdating && sala?.id) {
          const res = await fetch(`/api/salas/${sala.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error("Erro ao atualizar", { description: data.error });
            return;
          }
          const okFotos = await sincronizarFotosLayout(sala.id, layout);
          if (!okFotos) return;
          toast.success("Sala atualizada");
        } else {
          const res = await fetch("/api/salas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error("Erro ao cadastrar", { description: data.error });
            return;
          }
          if (layout === "MOVEL" && data.id) {
            const okFotos = await sincronizarFotosLayout(data.id, layout);
            if (!okFotos) {
              toast.message(
                "Sala criada, mas houve falha ao enviar alguma foto. Edite a sala para concluir.",
              );
            }
          }
          toast.success("Sala cadastrada");
        }
        router.push("/reserva-salas/salas");
        router.refresh();
      } catch {
        toast.error("Falha na comunicação com o servidor");
      }
    });
  }

  async function goNext() {
    if (step === 0) {
      const ok = await form.trigger([
        "nome",
        "andar",
        "numero",
        "lotacao",
        "layout",
      ]);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden",
          formClassName,
        )}
      >
        <nav
          aria-label="Etapas do cadastro"
          className="flex shrink-0 flex-wrap gap-2"
        >
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              onClick={() => {
                if (i <= step) setStep(i);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                i === step
                  ? "border-primary bg-primary/10 text-foreground enabled:cursor-pointer enabled:hover:bg-primary/15"
                  : i < step
                    ? "border-border bg-muted/40 text-muted-foreground enabled:cursor-pointer enabled:hover:border-primary/60 enabled:hover:bg-primary/10 enabled:hover:text-foreground"
                    : "border-dashed border-border text-muted-foreground opacity-70 disabled:cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
          {step === 0 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da sala</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sala de reunião" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="andar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Andar (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 2º andar, Térreo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da sala (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 182-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lotacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lotação (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex: 12"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? e.target.value : undefined,
                          )
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="FIXO">Fixo</option>
                        <option value="MOVEL">Móvel</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="m-0">Mobiliário</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendMobiliario({ nome: "", quantidade: 1 })}
                >
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>
              {fieldsMobiliarios.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum item adicionado.
                </p>
              )}
              {fieldsMobiliarios.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_120px_auto] gap-2 items-start"
                >
                  <FormField
                    control={form.control}
                    name={`mobiliarios.${index}.nome`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Ex: Cadeira" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`mobiliarios.${index}.quantidade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value ?? 1}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value || 1))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeMobiliario(index)}
                  >
                    <Minus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="m-0">Mídia</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendMidia({ nome: "", quantidade: 1 })}
                >
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>
              {fieldsMidias.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum item adicionado.
                </p>
              )}
              {fieldsMidias.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_120px_auto] gap-2 items-start"
                >
                  <FormField
                    control={form.control}
                    name={`midias.${index}.nome`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Ex: Projetor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`midias.${index}.quantidade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value ?? 1}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value || 1))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeMidia(index)}
                  >
                    <Minus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {layoutWatch === "MOVEL" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Cadastre uma imagem para cada tipo de disposição (ex.:
                    formato U, escolar, auditório). Formatos: JPEG, PNG, WebP ou
                    GIF, até 5 MB por arquivo.
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={appendLayoutFotoLinha}
                    >
                      <Plus className="size-4" /> Adicionar tipo de layout
                    </Button>
                  </div>
                  {layoutFotosLocal.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum layout cadastrado. Use &quot;Adicionar tipo de
                      layout&quot; para incluir fotos.
                    </p>
                  )}
                  {layoutFotosLocal.map((linha, index) => {
                    const previewSrc =
                      linha.objectUrl || linha.imagemUrl || null;
                    return (
                      <div
                        key={linha.key}
                        className="space-y-3 rounded-md border bg-muted/10 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div className="flex-1 space-y-1.5">
                            <label
                              className="text-sm font-medium leading-none"
                              htmlFor={`layout-tipo-${linha.key}`}
                            >
                              Tipo de layout
                            </label>
                            <Input
                              id={`layout-tipo-${linha.key}`}
                              placeholder="Ex: Formato U, Escolar, Mesa única"
                              value={linha.descricao}
                              onChange={(e) =>
                                setLayoutFotosLocal((prev) => {
                                  const next = [...prev];
                                  const cur = next[index];
                                  if (cur)
                                    next[index] = {
                                      ...cur,
                                      descricao: e.target.value,
                                    };
                                  return next;
                                })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => void removeLayoutFotoLinha(index)}
                            aria-label="Remover este layout"
                          >
                            <Minus className="size-4" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <label
                            className="text-sm font-medium leading-none"
                            htmlFor={`layout-arq-${linha.key}`}
                          >
                            Imagem
                          </label>
                          <Input
                            id={`layout-arq-${linha.key}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => onFileChangeLinha(index, e)}
                          />
                        </div>
                        {previewSrc && (
                          <div className="rounded-md border bg-background p-2">
                            <p className="mb-2 text-xs text-muted-foreground">
                              Pré-visualização
                            </p>
                            <img
                              src={previewSrc}
                              alt=""
                              className="max-h-36 w-full rounded object-contain sm:max-h-40"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Layout fixo não exige fotos de layout. Se alterar para
                  &quot;Móvel&quot; nos dados da sala, volte a esta etapa para
                  enviar as imagens.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-background pt-4 shadow-[0_-6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_-6px_16px_-4px_rgba(0,0,0,0.35)]">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>

          <div className="flex flex-wrap gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goPrev}>
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
            )}

            {step < STEPS.length - 1 && (
              <Button type="button" onClick={() => void goNext()}>
                Próximo
                <ChevronRight className="size-4" />
              </Button>
            )}

            {step === STEPS.length - 1 && (
              <Button disabled={isPending} type="submit">
                {isUpdating ? "Salvar" : "Cadastrar"}

                {isPending && (
                  <Loader2 className="ml-2 inline size-4 animate-spin" />
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
