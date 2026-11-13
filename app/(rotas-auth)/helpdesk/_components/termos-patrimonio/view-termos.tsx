"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import type { ItemPatrimonio } from "../../_types";
import { MESES_PT } from "@/lib/helpdesk/termos-types";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EBF1",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(20,30,55,0.04)",
  padding: 20,
};

const INPUT: React.CSSProperties = {
  border: "1px solid var(--helpdesk-input-border)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  color: "#1B2336",
  background: "var(--helpdesk-input-background)",
  outline: "none",
  width: "100%",
};

const LABEL: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

const BTN_PRIMARY: React.CSSProperties = {
  background: "#0A328D",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 18px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const BTN_GHOST: React.CSSProperties = {
  background: "transparent",
  color: "#4A5468",
  border: "1px solid #E8EBF1",
  borderRadius: 10,
  padding: "8px 16px",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
};

type TipoTermo = "entrega" | "oficio-saida" | "responsabilidade";

type BemForm = {
  idbem?: number;
  patrimonio: string;
  descricao: string;
  serviceTag: string;
  quantidade: number;
};

interface ViewTermosProps {
  itensPatrimonio: ItemPatrimonio[];
}

function hojePartes() {
  const d = new Date();
  return { dia: d.getDate(), mesIdx: d.getMonth(), ano: d.getFullYear() };
}

function fmtDataBr(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function BuscadorBens({
  itens,
  selecionados,
  onAdd,
  onRemove,
  showServiceTag,
}: {
  itens: ItemPatrimonio[];
  selecionados: BemForm[];
  onAdd: (b: BemForm) => void;
  onRemove: (patrimonio: string) => void;
  showServiceTag?: boolean;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const ids = new Set(selecionados.map((s) => s.patrimonio));
    return itens
      .filter(
        (i) =>
          !ids.has(i.patrimonio) &&
          (!q ||
            i.patrimonio.includes(q) ||
            i.descsbpm.toLowerCase().includes(q) ||
            i.marca?.toLowerCase().includes(q) ||
            i.modelo?.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [busca, itens, selecionados]);

  function addItem(item: ItemPatrimonio) {
    onAdd({
      idbem: item.idbem,
      patrimonio: item.patrimonio,
      descricao: item.descsbpm,
      serviceTag: item.numserie || item.cimbpm || "",
      quantidade: 1,
    });
    setBusca("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Pesquisar bem no inventário">
        <input
          style={INPUT}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Patrimônio, descrição, marca..."
        />
      </Field>
      {busca.trim() && filtrados.length > 0 && (
        <div
          style={{
            border: "1px solid #E8EBF1",
            borderRadius: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {filtrados.map((i) => (
            <button
              key={i.idbem}
              type="button"
              onClick={() => addItem(i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderBottom: "1px solid #F2F4F8",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <strong style={{ color: "#0A328D" }}>{i.patrimonio}</strong>
              <span style={{ color: "#4A5468" }}> — {i.descsbpm}</span>
              {i.marca && (
                <span style={{ color: "#7A8499", fontSize: 12 }}>
                  {" "}
                  · {i.marca} {i.modelo}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {selecionados.length > 0 && (
        <div style={{ border: "1px solid #E8EBF1", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAFBFD" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Patrimônio</th>
                <th style={{ padding: 8, textAlign: "left" }}>Descrição</th>
                {showServiceTag && (
                  <th style={{ padding: 8, textAlign: "left" }}>Service Tag</th>
                )}
                {showServiceTag && (
                  <th style={{ padding: 8, textAlign: "center", width: 80 }}>Qtd</th>
                )}
                <th style={{ padding: 8, width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {selecionados.map((b) => (
                <tr key={b.patrimonio} style={{ borderTop: "1px solid #F2F4F8" }}>
                  <td style={{ padding: 8, fontWeight: 700, color: "#0A328D" }}>
                    {b.patrimonio}
                  </td>
                  <td style={{ padding: 8 }}>{b.descricao}</td>
                  {showServiceTag && (
                    <td style={{ padding: 8 }}>
                      <input
                        style={{ ...INPUT, padding: "4px 8px", fontSize: 12 }}
                        value={b.serviceTag}
                        onChange={(e) =>
                          onAdd({ ...b, serviceTag: e.target.value })
                        }
                      />
                    </td>
                  )}
                  {showServiceTag && (
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <input
                        type="number"
                        min={1}
                        style={{ ...INPUT, padding: "4px 8px", fontSize: 12, width: 60 }}
                        value={b.quantidade}
                        onChange={(e) =>
                          onAdd({
                            ...b,
                            quantidade: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </td>
                  )}
                  <td style={{ padding: 8 }}>
                    <button
                      type="button"
                      onClick={() => onRemove(b.patrimonio)}
                      style={{
                        ...BTN_GHOST,
                        padding: "4px 8px",
                        fontSize: 12,
                        color: "#C0392B",
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BuscadorBemUnico({
  itens,
  onSelect,
  valor,
}: {
  itens: ItemPatrimonio[];
  onSelect: (item: ItemPatrimonio | null) => void;
  valor: ItemPatrimonio | null;
}) {
  const [busca, setBusca] = useState(valor ? `${valor.patrimonio} — ${valor.descsbpm}` : "");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q || (valor && busca === `${valor.patrimonio} — ${valor.descsbpm}`)) return [];
    return itens
      .filter(
        (i) =>
          i.patrimonio.includes(q) ||
          i.descsbpm.toLowerCase().includes(q) ||
          i.marca?.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [busca, itens, valor]);

  return (
    <Field label="Bem patrimonial" required>
      <input
        style={INPUT}
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          if (valor) onSelect(null);
        }}
        placeholder="Buscar patrimônio ou descrição..."
      />
      {filtrados.length > 0 && (
        <div
          style={{
            border: "1px solid #E8EBF1",
            borderRadius: 10,
            marginTop: 4,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {filtrados.map((i) => (
            <button
              key={i.idbem}
              type="button"
              onClick={() => {
                onSelect(i);
                setBusca(`${i.patrimonio} — ${i.descsbpm}`);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 14px",
                border: "none",
                borderBottom: "1px solid #F2F4F8",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <strong style={{ color: "#0A328D" }}>{i.patrimonio}</strong>
              <span> — {i.descsbpm}</span>
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

function BuscadorUsuario({
  onSelect,
}: {
  onSelect: (u: { nome: string; login: string } | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<{ nome: string; login: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/usuarios/busca?q=${encodeURIComponent(busca.trim())}`);
      if (r.ok) setResultados(await r.json());
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [busca]);

  return (
    <Field label="Solicitante">
      <input
        style={INPUT}
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          onSelect(null);
        }}
        placeholder="Nome ou login do servidor..."
      />
      {resultados.length > 0 && (
        <div
          style={{
            border: "1px solid #E8EBF1",
            borderRadius: 10,
            marginTop: 4,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {resultados.map((u) => (
            <button
              key={u.login}
              type="button"
              onClick={() => {
                onSelect(u);
                setBusca(u.nome);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 14px",
                border: "none",
                borderBottom: "1px solid #F2F4F8",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {u.nome} <span style={{ color: "#7A8499" }}>({u.login})</span>
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

async function baixarTermo(body: Record<string, unknown>, formato: "docx" | "pdf") {
  const r = await fetch("/api/helpdesk/termos/gerar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, formato }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data?.error ?? `Erro ${r.status}`);
  }
  const blob = await r.blob();
  const disp = r.headers.get("Content-Disposition") ?? "";
  const match = disp.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? (formato === "pdf" ? "termo.pdf" : "termo.docx");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BotoesGerar({
  loading,
  onGerar,
}: {
  loading: boolean;
  onGerar: (formato: "docx" | "pdf") => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={BTN_PRIMARY} onClick={() => onGerar("docx")} disabled={loading}>
        {loading ? "Gerando..." : "Gerar Word (.docx)"}
      </button>
      <button type="button" style={BTN_GHOST} onClick={() => onGerar("pdf")} disabled={loading}>
        {loading ? "Gerando..." : "Gerar PDF (.pdf)"}
      </button>
    </div>
  );
}

function FormEntrega({ itens }: { itens: ItemPatrimonio[] }) {
  const hoje = fmtDataBr(new Date().toISOString().slice(0, 10));
  const [bens, setBens] = useState<BemForm[]>([]);
  const [dataEntrega, setDataEntrega] = useState(hoje);
  const [dataRecebimento, setDataRecebimento] = useState(hoje);
  const [unidadeEntregador, setUnidadeEntregador] = useState("");
  const [unidadeRecebedor, setUnidadeRecebedor] = useState("");
  const [nomeEntregador, setNomeEntregador] = useState("");
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [rfEntregador, setRfEntregador] = useState("");
  const [rfRecebedor, setRfRecebedor] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function upsertBem(b: BemForm) {
    setBens((prev) => {
      const idx = prev.findIndex((x) => x.patrimonio === b.patrimonio);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = b;
        return next;
      }
      return [...prev, b];
    });
  }

  async function gerar(formato: "docx" | "pdf") {
    setErro(null);
    if (!bens.length) {
      setErro("Selecione ao menos um bem.");
      return;
    }
    setLoading(true);
    try {
      await baixarTermo({
        tipo: "entrega",
        bens: bens.map((b) => ({ patrimonio: b.patrimonio, descricao: b.descricao, serviceTag: b.serviceTag || undefined })),
        dataEntrega,
        dataRecebimento,
        unidadeEntregador,
        unidadeRecebedor,
        nomeEntregador,
        nomeRecebedor,
        rfEntregador,
        rfRecebedor,
      }, formato);
    } catch (e) {
      setErro(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 13, color: "#7A8499", margin: 0 }}>
        Termo de entrega e recebimento de bens patrimoniais entre unidades.
      </p>
      <BuscadorBens
        itens={itens}
        selecionados={bens}
        onAdd={upsertBem}
        onRemove={(p) => setBens((prev) => prev.filter((b) => b.patrimonio !== p))}
      />
      <Grid2>
        <Field label="Data de entrega">
          <input style={INPUT} value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Data de recebimento">
          <input style={INPUT} value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Unidade entregadora">
          <input style={INPUT} value={unidadeEntregador} onChange={(e) => setUnidadeEntregador(e.target.value)} />
        </Field>
        <Field label="Unidade recebedora">
          <input style={INPUT} value={unidadeRecebedor} onChange={(e) => setUnidadeRecebedor(e.target.value)} />
        </Field>
        <Field label="Nome do entregador">
          <input style={INPUT} value={nomeEntregador} onChange={(e) => setNomeEntregador(e.target.value)} />
        </Field>
        <Field label="Nome do recebedor">
          <input style={INPUT} value={nomeRecebedor} onChange={(e) => setNomeRecebedor(e.target.value)} />
        </Field>
        <Field label="RF entregador">
          <input style={INPUT} value={rfEntregador} onChange={(e) => setRfEntregador(e.target.value)} />
        </Field>
        <Field label="RF recebedor">
          <input style={INPUT} value={rfRecebedor} onChange={(e) => setRfRecebedor(e.target.value)} />
        </Field>
      </Grid2>
      {erro && <p style={{ color: "#C0392B", fontSize: 13 }}>{erro}</p>}
      <BotoesGerar loading={loading} onGerar={gerar} />
    </div>
  );
}

function FormOficio({ itens }: { itens: ItemPatrimonio[] }) {
  const { dia, mesIdx, ano } = hojePartes();
  const [bens, setBens] = useState<BemForm[]>([]);
  const [dataDia, setDataDia] = useState(dia);
  const [dataMesIdx, setDataMesIdx] = useState(mesIdx);
  const [dataAno, setDataAno] = useState(ano);
  const [numeroOficio, setNumeroOficio] = useState("");
  const [nomeSignatario, setNomeSignatario] = useState("");
  const [rfSignatario, setRfSignatario] = useState("");
  const [cargoSignatario, setCargoSignatario] = useState("");
  const [setorSignatario, setSetorSignatario] = useState("");
  const [destinatario, setDestinatario] = useState(
    "administrador - Condomínio Edifício Martinelli"
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function upsertBem(b: BemForm) {
    setBens((prev) => {
      const idx = prev.findIndex((x) => x.patrimonio === b.patrimonio);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = b;
        return next;
      }
      return [...prev, b];
    });
  }

  async function gerar(formato: "docx" | "pdf") {
    setErro(null);
    if (!bens.length) {
      setErro("Selecione ao menos um bem.");
      return;
    }
    setLoading(true);
    try {
      await baixarTermo({
        tipo: "oficio-saida",
        dataCidade: "São Paulo",
        dataDia,
        dataMesIdx,
        dataAno,
        numeroOficio,
        bens: bens.map((b) => ({
          patrimonio: b.patrimonio,
          descricao: b.descricao,
          serviceTag: b.serviceTag,
          quantidade: b.quantidade,
        })),
        nomeSignatario,
        rfSignatario,
        cargoSignatario,
        setorSignatario,
        destinatario,
      }, formato);
    } catch (e) {
      setErro(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 13, color: "#7A8499", margin: 0 }}>
        Ofício de retirada de equipamento das dependências do condomínio.
      </p>
      <Grid2>
        <Field label="Número do ofício" required>
          <input
            style={INPUT}
            value={numeroOficio}
            onChange={(e) => setNumeroOficio(e.target.value)}
            placeholder="Ex: 22/SMUL/ATECC/2025"
          />
        </Field>
        <Field label="Data">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min={1}
              max={31}
              style={{ ...INPUT, width: 60 }}
              value={dataDia}
              onChange={(e) => setDataDia(Number(e.target.value))}
            />
            <select
              style={INPUT}
              value={dataMesIdx}
              onChange={(e) => setDataMesIdx(Number(e.target.value))}
            >
              {MESES_PT.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              style={{ ...INPUT, width: 80 }}
              value={dataAno}
              onChange={(e) => setDataAno(Number(e.target.value))}
            />
          </div>
        </Field>
      </Grid2>
      <BuscadorBens
        itens={itens}
        selecionados={bens}
        onAdd={upsertBem}
        onRemove={(p) => setBens((prev) => prev.filter((b) => b.patrimonio !== p))}
        showServiceTag
      />
      <Grid2>
        <Field label="Nome do signatário">
          <input style={INPUT} value={nomeSignatario} onChange={(e) => setNomeSignatario(e.target.value)} />
        </Field>
        <Field label="RF do signatário">
          <input style={INPUT} value={rfSignatario} onChange={(e) => setRfSignatario(e.target.value)} />
        </Field>
        <Field label="Cargo">
          <input style={INPUT} value={cargoSignatario} onChange={(e) => setCargoSignatario(e.target.value)} />
        </Field>
        <Field label="Setor">
          <input style={INPUT} value={setorSignatario} onChange={(e) => setSetorSignatario(e.target.value)} />
        </Field>
        <Field label="Destinatário">
          <input style={INPUT} value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
        </Field>
      </Grid2>
      {erro && <p style={{ color: "#C0392B", fontSize: 13 }}>{erro}</p>}
      <BotoesGerar loading={loading} onGerar={gerar} />
    </div>
  );
}

function FormResponsabilidade({ itens }: { itens: ItemPatrimonio[] }) {
  const { dia, mesIdx, ano } = hojePartes();
  const [bem, setBem] = useState<ItemPatrimonio | null>(null);
  const [solicitante, setSolicitante] = useState("");
  const [rf, setRf] = useState("");
  const [setorUnidade, setSetorUnidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [tipoEquipamento, setTipoEquipamento] = useState("");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [dataRetirada, setDataRetirada] = useState(
    fmtDataBr(new Date().toISOString().slice(0, 10))
  );
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [objetivoUso, setObjetivoUso] = useState("");
  const [localUso, setLocalUso] = useState("");
  const [condicaoPerfeita, setCondicaoPerfeita] = useState(true);
  const [problemasDescricao, setProblemasDescricao] = useState("");
  const [dataDia, setDataDia] = useState(dia);
  const [dataMesIdx, setDataMesIdx] = useState(mesIdx);
  const [dataAno, setDataAno] = useState(ano);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function selecionarBem(item: ItemPatrimonio | null) {
    setBem(item);
    if (item) {
      setPatrimonio(item.patrimonio);
      setTipoEquipamento(item.tipo);
      setMarcaModelo([item.marca, item.modelo].filter(Boolean).join(" - "));
      setNumeroSerie(item.numserie || "");
      setLocalUso(item.localizacao || "");
    }
  }

  function selecionarUsuario(u: { nome: string; login: string } | null) {
    if (u) {
      setSolicitante(u.nome);
      setRf(u.login);
    }
  }

  async function gerar(formato: "docx" | "pdf") {
    setErro(null);
    if (!patrimonio.trim()) {
      setErro("Informe o patrimônio ou selecione um bem.");
      return;
    }
    setLoading(true);
    try {
      await baixarTermo({
        tipo: "responsabilidade",
        solicitante,
        rf,
        setorUnidade,
        telefone,
        patrimonio,
        tipoEquipamento,
        marcaModelo,
        numeroSerie,
        dataRetirada,
        dataDevolucao,
        objetivoUso,
        localUso,
        condicaoPerfeita,
        problemasDescricao,
        dataCidade: "São Paulo",
        dataDia,
        dataMesIdx,
        dataAno,
      }, formato);
    } catch (e) {
      setErro(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 13, color: "#7A8499", margin: 0 }}>
        Termo de responsabilidade por empréstimo de equipamento.
      </p>
      <BuscadorUsuario onSelect={selecionarUsuario} />
      <Grid2>
        <Field label="Solicitante (nome completo)">
          <input style={INPUT} value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
        </Field>
        <Field label="RF (login)">
          <input style={INPUT} value={rf} onChange={(e) => setRf(e.target.value)} />
        </Field>
        <Field label="Setor / Unidade">
          <input style={INPUT} value={setorUnidade} onChange={(e) => setSetorUnidade(e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input style={INPUT} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </Field>
      </Grid2>
      <BuscadorBemUnico itens={itens} onSelect={selecionarBem} valor={bem} />
      <Grid2>
        <Field label="Nº patrimonial" required>
          <input style={INPUT} value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} />
        </Field>
        <Field label="Tipo do equipamento">
          <input style={INPUT} value={tipoEquipamento} onChange={(e) => setTipoEquipamento(e.target.value)} />
        </Field>
        <Field label="Marca e modelo">
          <input style={INPUT} value={marcaModelo} onChange={(e) => setMarcaModelo(e.target.value)} />
        </Field>
        <Field label="Número de série">
          <input style={INPUT} value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
        </Field>
        <Field label="Data de retirada">
          <input style={INPUT} value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)} placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Data de devolução">
          <input style={INPUT} value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} placeholder="DD/MM/AAAA ou em branco" />
        </Field>
        <Field label="Objetivo de uso">
          <input style={INPUT} value={objetivoUso} onChange={(e) => setObjetivoUso(e.target.value)} />
        </Field>
        <Field label="Local de uso">
          <input style={INPUT} value={localUso} onChange={(e) => setLocalUso(e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Condição do equipamento">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              checked={condicaoPerfeita}
              onChange={() => setCondicaoPerfeita(true)}
            />
            Em perfeitas condições de uso e bom estado de conservação
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              checked={!condicaoPerfeita}
              onChange={() => setCondicaoPerfeita(false)}
            />
            Com problemas e/ou danos
          </label>
          {!condicaoPerfeita && (
            <textarea
              rows={3}
              style={{ ...INPUT, fontFamily: "inherit", resize: "vertical" }}
              value={problemasDescricao}
              onChange={(e) => setProblemasDescricao(e.target.value)}
              placeholder="Descreva os problemas ou danos..."
            />
          )}
        </div>
      </Field>
      <Field label="Data do termo">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={1}
            max={31}
            style={{ ...INPUT, width: 60 }}
            value={dataDia}
            onChange={(e) => setDataDia(Number(e.target.value))}
          />
          <select
            style={INPUT}
            value={dataMesIdx}
            onChange={(e) => setDataMesIdx(Number(e.target.value))}
          >
            {MESES_PT.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            style={{ ...INPUT, width: 80 }}
            value={dataAno}
            onChange={(e) => setDataAno(Number(e.target.value))}
          />
        </div>
      </Field>
      {erro && <p style={{ color: "#C0392B", fontSize: 13 }}>{erro}</p>}
      <BotoesGerar loading={loading} onGerar={gerar} />
    </div>
  );
}

const TABS: { id: TipoTermo; label: string }[] = [
  { id: "entrega", label: "Termo de Entrega" },
  { id: "oficio-saida", label: "Ofício Saída Prédio" },
  { id: "responsabilidade", label: "Termo de Responsabilidade" },
];

export function ViewTermos({ itensPatrimonio }: ViewTermosProps) {
  const [tab, setTab] = useState<TipoTermo>("entrega");

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1B2336", margin: "0 0 8px" }}>
        Termos Patrimoniais
      </h1>
      <p style={{ fontSize: 13, color: "#7A8499", margin: "0 0 24px" }}>
        Preencha os campos e gere documentos Word ou PDF com base nos modelos do setor de patrimônio.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...(tab === t.id ? BTN_PRIMARY : BTN_GHOST),
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={CARD}>
        {tab === "entrega" && <FormEntrega itens={itensPatrimonio} />}
        {tab === "oficio-saida" && <FormOficio itens={itensPatrimonio} />}
        {tab === "responsabilidade" && (
          <FormResponsabilidade itens={itensPatrimonio} />
        )}
      </div>
    </div>
  );
}
