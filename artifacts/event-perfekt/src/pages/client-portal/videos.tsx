import { useEffect, useState } from "react";
import PortalLayout from "./layout";
import { portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";

type Video = {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  video_type: string;
  category: string;
  source?: string;
  is_featured: boolean;
  view_count: number;
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function VideoEmbed({ video }: { video: Video }) {
  const ytId = extractYouTubeId(video.video_url);
  if (ytId) {
    return <iframe src={`https://www.youtube.com/embed/${ytId}`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 8 }} />;
  }
  if (video.video_type === "uploaded") {
    return <video controls style={{ width: "100%", borderRadius: 8, aspectRatio: "16/9", background: "#000" }}><source src={video.video_url} /></video>;
  }
  return <a href={video.video_url} target="_blank" rel="noreferrer" style={{ display: "block", aspectRatio: "16/9", background: "#1a0a0e", color: "#fff", borderRadius: 8, textAlign: "center", padding: 40, textDecoration: "none" }}>▶ Open Video</a>;
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    portalFetch("GET", "/api/client-portal/videos").then(r => {
      setVideos(Array.isArray(r) ? r : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(videos.map(v => v.category)))];
  const filtered = categoryFilter === "All" ? videos : videos.filter(v => v.category === categoryFilter);
  const featured = videos.find(v => v.is_featured);
  const rest = filtered.filter(v => !v.is_featured || categoryFilter !== "All");

  async function play(video: Video) {
    setPlaying(video);
    portalFetch("POST", `/api/client-portal/videos/${video.id}/view`).catch(() => null);
  }

  return (
    <PortalLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a0a0e", margin: "0 0 4px" }}>Video Library</h1>
        <p style={{ color: "#666", fontSize: 13, margin: 0 }}>Resources, guidance, and news for ALLI Foundation.</p>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading videos...</div> : (
        <>
          {featured && categoryFilter === "All" && (
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BURGUNDY, letterSpacing: 1, marginBottom: 10 }}>★ FEATURED VIDEO</div>
              <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 12, padding: 18 }}>
                <VideoEmbed video={featured} />
                <div style={{ marginTop: 14 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a0a0e", margin: "0 0 6px" }}>{featured.title}</h2>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#f0ebe6", color: BURGUNDY, padding: "2px 8px", borderRadius: 100 }}>{featured.category}</span>
                    <span style={{ fontSize: 11, color: "#888" }}>{featured.source}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{featured.description}</p>
                </div>
              </div>
            </section>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} style={{ background: categoryFilter === c ? BURGUNDY : "#fff", color: categoryFilter === c ? "#fff" : "#555", border: "1px solid " + (categoryFilter === c ? BURGUNDY : "#e8e0d8"), borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{c}</button>
            ))}
          </div>

          {rest.length === 0 && !featured ? (
            <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#666" }}>No videos available yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {rest.map(v => (
                <div key={v.id} onClick={() => play(v)} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ aspectRatio: "16/9", background: "#1a0a0e", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
                      <div style={{ background: "#fff", color: BURGUNDY, borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>▶</div>
                    </div>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: BURGUNDY, marginBottom: 4 }}>{v.category}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0a0e", marginBottom: 4 }}>{v.title}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{v.source} {v.view_count > 0 && `· ${v.view_count} view${v.view_count !== 1 ? "s" : ""}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {playing && (
        <div onClick={() => setPlaying(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, maxWidth: 960, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a0a0e" }}>{playing.title}</h2>
              <button onClick={() => setPlaying(null)} style={{ background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" }}>×</button>
            </div>
            <VideoEmbed video={playing} />
            {playing.description && <p style={{ marginTop: 14, fontSize: 13, color: "#555", lineHeight: 1.6 }}>{playing.description}</p>}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
