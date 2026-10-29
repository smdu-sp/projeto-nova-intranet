"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { Paginacao } from "./paginacao";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  className?: string;

  paginaAtual: number;
  limitePorPagina: number;
  totalItens: number;

  labelItemSingular?: string;
  labelItemPlural?: string;
}

export default function DataTable<TData, TValue>({
  columns,
  data,

  className,

  paginaAtual,
  limitePorPagina,
  totalItens,

  labelItemSingular = "item",
  labelItemPlural = "itens",
}: DataTableProps<TData, TValue>) {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const totalPaginas = Math.ceil(totalItens / limitePorPagina) || 1;

  const table = useReactTable({
    data,
    columns,

    getCoreRowModel: getCoreRowModel(),
  });

  const handlePageChange = (novaPagina: number) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("pagina", String(novaPagina));

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLimiteChange = (novoLimite: number) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("limite", String(novoLimite));

    params.set("pagina", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-md border", className)}>
      <Table className="bg-background dark:bg-muted/50">
        <TableHeader className="bg-primary hover:bg-primary">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-primary">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-white">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Sem resultados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Paginacao
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        totalItens={totalItens}
        limitePorPagina={limitePorPagina}
        labelItemSingular={labelItemSingular}
        labelItemPlural={labelItemPlural}
        onPageChange={handlePageChange}
        onLimiteChange={handleLimiteChange}
      />
    </div>
  );
}

export function TableSkeleton() {
	return <Skeleton className="h-[240px] w-full rounded-xl" />;
}