"use client";

import { useEffect, useState } from "react";
import type { CoordenadoriaOption, SalaOption } from "../services/reservas";
import { AgendaSala, type ReservaAgenda } from "./agenda-sala";
import { FormNovaReserva } from "./form-nova-reserva";

export function NovaReservaLayout({
  salas,
  coordenadorias,
  coordenadoriaIdPadrao,
  isAdmin = false,
  usuarioNome,
  usuarioEmail,
}: {
  salas: SalaOption[];
  coordenadorias: CoordenadoriaOption[];
  coordenadoriaIdPadrao: string;
  isAdmin?: boolean;
  usuarioNome?: string | null;
  usuarioEmail?: string | null;
}) {
  const [salaId, setSalaId] = useState("");
  const [data, setData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [reservas, setReservas] = useState<ReservaAgenda[]>([]);
  const [reservasLoading, setReservasLoading] = useState(false);
  const [erroReservas, setErroReservas] = useState<string | null>(null);
  const [atualizacaoAgenda, setAtualizacaoAgenda] = useState(0);

  useEffect(() => {
    if (!salaId || !data) {
      setReservas([]);
      setErroReservas(null);
      setReservasLoading(false);
      return;
    }

    const controller = new AbortController();
    setReservas([]);
    setErroReservas(null);
    setReservasLoading(true);

    fetch(`/api/reservas?salaId=${encodeURIComponent(salaId)}&data=${data}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao consultar reservas (${response.status}).`);
        }
        const result: unknown = await response.json();
        if (
          !Array.isArray(result) ||
          !result.every(
            (reserva): reserva is ReservaAgenda =>
              typeof reserva === "object" &&
              reserva !== null &&
              "id" in reserva &&
              typeof reserva.id === "string" &&
              "inicio" in reserva &&
              typeof reserva.inicio === "string" &&
              "fim" in reserva &&
              typeof reserva.fim === "string"
          )
        ) {
          throw new Error("A resposta de reservas está em formato inválido.");
        }
        setReservas(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Erro ao consultar reservas da sala:", error);
        setErroReservas("Não foi possível verificar os horários reservados. Tente novamente.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setReservasLoading(false);
      });

    return () => controller.abort();
  }, [salaId, data, atualizacaoAgenda]);

  useEffect(() => {
    if (!salaId || !data) return;
    const timer = window.setInterval(
      () => setAtualizacaoAgenda((atualizacao) => atualizacao + 1),
      30_000
    );
    return () => window.clearInterval(timer);
  }, [salaId, data]);

  const salaNome =
    salas.find((s) => s.id === salaId)?.nome ?? "Selecione uma sala";

  return (
    <div className="min-w-0">
      <FormNovaReserva
        salas={salas}
        coordenadorias={coordenadorias}
        coordenadoriaIdPadrao={coordenadoriaIdPadrao}
        valueSalaId={salaId}
        valueData={data}
        onSalaChange={setSalaId}
        onDataChange={setData}
        usuarioNome={usuarioNome}
        usuarioEmail={usuarioEmail}
        reservas={reservas}
        reservasLoading={reservasLoading}
        erroReservas={erroReservas}
        agendaSlot={
          <AgendaSala
            salaId={salaId || null}
            data={data || null}
            salaNome={salaNome}
            isAdmin={isAdmin}
            reservas={reservas}
            loading={reservasLoading}
            erro={erroReservas}
          />
        }
      />
    </div>
  );
}
