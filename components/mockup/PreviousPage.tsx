import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PreviousPage() {
  return (
    <Link href={"/mockup"} className=" flex justify-center items-center gap-2  w-fit h-8 text-[#1f7a3d] cursor-pointer">
      <ArrowLeft size={14} />
      <p className="text-xs font-bold">Início</p>
    </Link>
  );
}
