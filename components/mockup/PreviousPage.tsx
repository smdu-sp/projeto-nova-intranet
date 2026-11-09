import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PreviousPage() {
  return (
    <Link
      href="/mockup"
      className="inline-flex items-center gap-1.5 w-fit h-8 px-2 -ml-2 rounded-lg text-[#1f7a3d] hover:bg-[#1f7a3d]/10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] transition-colors cursor-pointer"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      <span className="text-xs font-bold">Voltar para o início</span>
    </Link>
  );
}
