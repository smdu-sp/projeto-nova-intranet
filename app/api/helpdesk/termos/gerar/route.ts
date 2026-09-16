import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { gerarDocumentoTermo } from "@/lib/helpdesk/gerar-termos";
import { gerarDocumentoTermoPdf } from "@/lib/helpdesk/gerar-termos-pdf";
import {
  MESES_PT,
  nomeArquivoTermo,
  type BemTermo,
  type FormatoTermo,
  type TermoPayload,
} from "@/lib/helpdesk/termos-types";
import { podeAcessarPatrimonioHelpdesk } from "@/lib/permissoes";

function texto(v: unknown, max = 300): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function parseBens(raw: unknown): BemTermo[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const bens: BemTermo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const patrimonio = texto(o.patrimonio, 50);
    const descricao = texto(o.descricao, 300);
    if (!patrimonio || !descricao) continue;
    bens.push({
      patrimonio,
      descricao,
      serviceTag: texto(o.serviceTag, 100) || undefined,
      quantidade: typeof o.quantidade === "number" && o.quantidade > 0 ? o.quantidade : 1,
    });
  }
  return bens.length ? bens : null;
}

function parsePayload(body: Record<string, unknown>): { payload?: TermoPayload; error?: string } {
  const tipo = body.tipo;
  if (tipo === "entrega") {
    const bens = parseBens(body.bens);
    if (!bens) return { error: "Informe ao menos um bem patrimonial" };
    return {
      payload: {
        tipo: "entrega",
        bens,
        dataEntrega: texto(body.dataEntrega, 20),
        dataRecebimento: texto(body.dataRecebimento, 20),
        unidadeEntregador: texto(body.unidadeEntregador, 120),
        unidadeRecebedor: texto(body.unidadeRecebedor, 120),
        nomeEntregador: texto(body.nomeEntregador, 120),
        nomeRecebedor: texto(body.nomeRecebedor, 120),
        rfEntregador: texto(body.rfEntregador, 30),
        rfRecebedor: texto(body.rfRecebedor, 30),
      },
    };
  }

  if (tipo === "oficio-saida") {
    const bens = parseBens(body.bens);
    if (!bens) return { error: "Informe ao menos um bem patrimonial" };
    const mesIdx = Number(body.dataMesIdx);
    const mes =
      Number.isInteger(mesIdx) && mesIdx >= 0 && mesIdx <= 11
        ? MESES_PT[mesIdx]
        : texto(body.dataMes, 20);
    return {
      payload: {
        tipo: "oficio-saida",
        dataCidade: texto(body.dataCidade, 80) || "São Paulo",
        dataDia: Math.min(31, Math.max(1, Number(body.dataDia) || 1)),
        dataMes: mes || MESES_PT[new Date().getMonth()],
        dataAno: Number(body.dataAno) || new Date().getFullYear(),
        numeroOficio: texto(body.numeroOficio, 60),
        bens,
        nomeSignatario: texto(body.nomeSignatario, 120),
        cargoSignatario: texto(body.cargoSignatario, 80),
        setorSignatario: texto(body.setorSignatario, 120),
        destinatario: texto(body.destinatario, 200) || "administrador - Condomínio Edifício Martinelli",
      },
    };
  }

  if (tipo === "responsabilidade") {
    const patrimonio = texto(body.patrimonio, 50);
    if (!patrimonio) return { error: "Patrimônio é obrigatório" };
    const mesIdx = Number(body.dataMesIdx);
    const mes =
      Number.isInteger(mesIdx) && mesIdx >= 0 && mesIdx <= 11
        ? MESES_PT[mesIdx]
        : texto(body.dataMes, 20);
    return {
      payload: {
        tipo: "responsabilidade",
        solicitante: texto(body.solicitante, 120),
        rf: texto(body.rf, 30),
        setorUnidade: texto(body.setorUnidade, 120),
        telefone: texto(body.telefone, 30),
        patrimonio,
        tipoEquipamento: texto(body.tipoEquipamento, 80),
        marcaModelo: texto(body.marcaModelo, 120),
        numeroSerie: texto(body.numeroSerie, 80),
        dataRetirada: texto(body.dataRetirada, 20),
        dataDevolucao: texto(body.dataDevolucao, 20),
        objetivoUso: texto(body.objetivoUso, 500),
        localUso: texto(body.localUso, 200),
        condicaoPerfeita: body.condicaoPerfeita !== false,
        problemasDescricao: texto(body.problemasDescricao, 500),
        dataCidade: texto(body.dataCidade, 80) || "São Paulo",
        dataDia: Math.min(31, Math.max(1, Number(body.dataDia) || 1)),
        dataMes: mes || MESES_PT[new Date().getMonth()],
        dataAno: Number(body.dataAno) || new Date().getFullYear(),
      },
    };
  }

  return { error: "Tipo de termo inválido" };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const permissao = (session as { usuario?: { permissao?: string } }).usuario?.permissao ?? "";
  if (!podeAcessarPatrimonioHelpdesk(permissao)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (parsed.error || !parsed.payload) {
    return NextResponse.json({ error: parsed.error ?? "Dados inválidos" }, { status: 400 });
  }

  const formatoRaw = body.formato;
  const formato: FormatoTermo = formatoRaw === "pdf" ? "pdf" : "docx";

  const buffer =
    formato === "pdf"
      ? await gerarDocumentoTermoPdf(parsed.payload)
      : await gerarDocumentoTermo(parsed.payload);
  const filename = nomeArquivoTermo(parsed.payload.tipo, formato);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
