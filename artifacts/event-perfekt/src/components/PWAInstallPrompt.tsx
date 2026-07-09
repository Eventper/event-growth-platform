import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    window.addEventListener("appinstalled", () => { setInstalled(true); setShowBanner(false); });

    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  if (!showBanner || installed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-[#1a0508] border border-[#8B1538]/60 rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#8B1538] flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Add to Home Screen</p>
          <p className="text-white/60 text-xs mt-0.5">Install Event Perfekt for quick access — works on any phone</p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-[#8B1538] hover:bg-[#6d1029] text-white text-xs px-3 py-1 h-7"
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white/50 hover:text-white text-xs px-3 py-1 h-7"
            >
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-white/40 hover:text-white flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
