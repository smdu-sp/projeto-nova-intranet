import Link from "next/link";
import { listarMinhasReservas } from "../../services/reservas";
import { MinhasReservasTable } from "./minhas-reservas-table";

interface MinhasReservasContentProps {
  usuarioLogin: string;
}

export async function MinhasReservasContent({ usuarioLogin }: MinhasReservasContentProps) {
  const reservas = await listarMinhasReservas(usuarioLogin);

  return (
    <div className="flex flex-col gap-3 w-full">
      {reservas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Você não possui reservas futuras.{" "}
          <Link href="/reserva-salas/nova" className="text-primary underline">
            Fazer uma reserva
          </Link>
        </p>
      ) : (
        //fixme: precisa passar o total de itens do servidor
        <MinhasReservasTable reservas={reservas} totalItens={reservas.length} />
      )}
    </div>
  );
}