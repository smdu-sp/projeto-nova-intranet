import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="flex flex-col justify-center items-center text-center gap-1.5 bg-gray-100 border-t border-gray-200 py-8 px-6 mt-auto">
      <p className="text-[13px] font-medium text-gray-800">
        Secretaria Municipal de Urbanismo e Licenciamento — SMUL · Comissão Interna de Prevenção de Acidentes e Assédio (CIPA)
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <a
          className="hover:text-[#1f7a3d] hover:underline transition-colors cursor-pointer"
          href="mailto:cipasmul@prefeitura.sp.gov.br"
        >
          cipasmul@prefeitura.sp.gov.br
        </a>
        <span aria-hidden="true">·</span>
        <Link
          href="/mockup/fale-conosco"
          className="hover:text-[#1f7a3d] hover:underline transition-colors"
        >
          Canais de Atendimento e Acolhimento
        </Link>
      </div>
    </footer>
  );
};
