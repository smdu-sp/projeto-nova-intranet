import PreviousPage from "@/components/mockup/PreviousPage";
import { VideoCard } from "@/components/mockup/VideoCard";

export default function Videos() {
  const videosList = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
  }));

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />
      <div className="flex-1 flex-col gap-4 py-4">
        <h1 className="text-3xl font-bold">Venha assistir nossos vídeos</h1>
        <p className="text-xs max-w-[420px]">Vídeos produzidos pela CIPA, disponíveis para assistir a qualquer momento — todos com legendas para garantir acessibilidade.</p>
      </div>
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6  mb-8">
        {videosList.map((video) => (
          <VideoCard key={video.id} id={video.id} />
        ))}
      </section>
    </main>
  );
}
