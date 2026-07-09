import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Download, Image, X, ChevronLeft, ChevronRight, Eye, Camera } from "lucide-react";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

interface GalleryAlbum {
  id: number;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
}

interface GalleryItem {
  id: number;
  album_id: number;
  file_url: string;
  file_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export default function GalleryPublic() {
  usePageMeta({ title: "Photo Gallery — Event Perfekt" });

  const params = useParams<{ shareToken: string }>();
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data, isLoading, error } = useQuery<{ album: GalleryAlbum; items: GalleryItem[] }>({
    queryKey: ["/api/gallery/public", params.shareToken],
  });

  const album = data?.album;
  const items = data?.items || [];

  const openLightbox = (item: GalleryItem, index: number) => {
    setLightboxItem(item);
    setLightboxIndex(index);
  };

  const navigateLightbox = (dir: number) => {
    const newIndex = lightboxIndex + dir;
    if (newIndex >= 0 && newIndex < items.length) {
      setLightboxIndex(newIndex);
      setLightboxItem(items[newIndex]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#8B1538] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Gallery Not Found</h2>
          <p className="text-gray-500">This gallery may not exist or is no longer shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="Event Perfekt" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-[Poppins]">{album.title}</h1>
              {album.description && <p className="text-gray-500 text-sm">{album.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Camera className="w-4 h-4" />
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl text-gray-500">This album is empty</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
                onClick={() => openLightbox(item, index)}
              >
                {item.file_type === "video" ? (
                  <video src={item.file_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.file_url} alt={item.caption || ""} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{item.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm border-t border-gray-200 mt-8">
        Powered by <span className="text-[#8B1538] font-semibold">Event Perfekt</span> — ...making yours perfekt
      </footer>

      {lightboxItem && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setLightboxItem(null)}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setLightboxItem(null); }}
            className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
          >
            <X className="w-6 h-6" />
          </Button>
          {lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 text-white hover:bg-white/10 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          {lightboxIndex < items.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 text-white hover:bg-white/10 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {lightboxItem.file_type === "video" ? (
              <video src={lightboxItem.file_url} controls className="max-w-full max-h-[80vh] rounded-lg" />
            ) : (
              <img src={lightboxItem.file_url} alt={lightboxItem.caption || ""} className="max-w-full max-h-[80vh] rounded-lg object-contain" />
            )}
            {lightboxItem.caption && (
              <p className="text-white/80 mt-4 text-center">{lightboxItem.caption}</p>
            )}
            <div className="flex gap-3 mt-4">
              <a href={lightboxItem.file_url} download className="inline-flex">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  <Download className="w-4 h-4 mr-2" />Download
                </Button>
              </a>
              <span className="text-white/40 text-sm flex items-center">
                {lightboxIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
