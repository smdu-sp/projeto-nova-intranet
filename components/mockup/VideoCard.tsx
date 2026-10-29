import { Image as ImageIcon } from "lucide-react";

interface VideoCardProps {
  id: number;
  title?: string;
  status?: string;
}

export function VideoCard({ id, title, status = "Em breve" }: VideoCardProps) {
  const videoTitle = title || `Vídeo da CIPA #${id}`;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="w-full h-20 flex flex-col items-center justify-center rounded-tl-2xl rounded-tr-2xl gap-2 bg-[#f5f5f7] border border-dashed border-gray-300 p-4">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 font-normal">Miniatura do vídeo</span>
      </div>
      <div className="flex flex-col gap-1 mt-4 p-2 rounded-bl-2xl rounded-br-2xl">
        <p className="font-bold text-sm text-gray-900">{videoTitle}</p>
        <p className="text-xs text-gray-500 italic">{status}</p>
      </div>
    </div>
  );
}
