"use client";

const HORA_INICIO = 9;
const HORA_FIM = 19;
const MINUTOS_TOTAL = (HORA_FIM - HORA_INICIO) * 60;

export type ReservaAgenda = {
  id: string;
  inicio: string;
  fim: string;
  titulo?: string;
  usuarioNome?: string | null;
};

function minutosDesdeNoveHoras(d: Date): number {
  const h = d.getHours();
  const min = d.getMinutes();
  return (h - HORA_INICIO) * 60 + min;
}

export function AgendaSala({
  salaId,
  data,
  salaNome,
  isAdmin = false,
  reservas,
  loading,
  erro,
}: {
  salaId: string | null;
  data: string | null;
  salaNome: string;
  isAdmin?: boolean;
  reservas: ReservaAgenda[];
  loading: boolean;
  erro: string | null;
}) {
  if (!salaId || !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">
          Selecione uma sala e uma data para ver a agenda do dia.
        </p>
      </div>
    );
  }

  const horas: number[] = [];
  for (let h = HORA_INICIO; h < HORA_FIM; h++) horas.push(h);

  const barras = reservas
    .map((r) => {
      const inicio = new Date(r.inicio);
      const fim = new Date(r.fim);
      const topMin = Math.max(0, minutosDesdeNoveHoras(inicio));
      const fimMin = Math.min(MINUTOS_TOTAL, minutosDesdeNoveHoras(fim));
      const duracaoMin = Math.max(0, fimMin - topMin);
      if (duracaoMin <= 0) return null;
      const topPct = (topMin / MINUTOS_TOTAL) * 100;
      const heightPct = (duracaoMin / MINUTOS_TOTAL) * 100;
      return {
        ...r,
        topPct,
        heightPct,
        duracaoMin,
      };
    })
    .filter(Boolean) as (ReservaAgenda & {
    topPct: number;
    heightPct: number;
    duracaoMin: number;
  })[];

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col min-h-[420px]">
      <div className="px-4 py-3 border-b bg-muted/40">
        <h2 className="font-semibold text-sm">Agenda da sala</h2>
        <p className="text-xs text-muted-foreground truncate">{salaNome}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>
      <div className="flex relative" style={{ height: `${MINUTOS_TOTAL}px` }}>
        <div className="w-12 shrink-0 flex flex-col border-r text-right pr-2 py-1 text-xs text-muted-foreground">
          {horas.map((h) => (
            <div
              key={h}
              className="flex items-start justify-end"
              style={{ height: `${60}px` }}
            >
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="flex-1 relative overflow-hidden h-full">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Carregando agenda...
              </span>
            </div>
          ) : erro ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20 p-4 text-center">
              <span className="text-sm text-destructive">{erro}</span>
            </div>
          ) : (
            <>
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-border/60"
                  style={{
                    top: `${((h - HORA_INICIO) * 60 / MINUTOS_TOTAL) * 100}%`,
                    height: `${(60 / MINUTOS_TOTAL) * 100}%`,
                  }}
                />
              ))}
              {barras.map((r) => (
                <div
                  key={r.id}
                  className="absolute left-1 right-1 rounded-md overflow-hidden shadow-sm border border-border"
                  style={{
                    top: `${r.topPct}%`,
                    height: `${r.heightPct}%`,
                    minHeight: "24px",
                  }}
                  title={isAdmin ? `${r.titulo ?? ""} • ${r.usuarioNome ?? ""}` : undefined}
                >
                  <div
                    className={`h-full w-full flex flex-col justify-center px-2 py-0.5 text-left overflow-hidden transition-colors border border-border/80 ${
                      isAdmin
                        ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-foreground"
                        : "bg-gray-200 text-muted-foreground dark:bg-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <span className="text-xs font-medium truncate block text-foreground">
                          {r.titulo ?? "Sem título"}
                        </span>
                        {r.usuarioNome && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {r.usuarioNome}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-medium truncate block text-center">
                        INDISPONÍVEL
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        Horário do prédio: 9h às 19h
      </div>
    </div>
  );
}
