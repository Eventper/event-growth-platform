import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { Link } from "wouter";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const acceptAll = () => {
    localStorage.setItem("cookie_consent", JSON.stringify({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem("cookie_consent", JSON.stringify({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  if (showDetails) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1a0209]/98 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="max-w-3xl mx-auto px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[#E2C87A]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-[#E2C87A]" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm mb-1">Cookie & Privacy Notice</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                We use essential cookies to make this site work. Optional cookies help us improve your experience and analyse usage. Your data is processed under GDPR and the UK Data Protection Act 2018. <Link href="/privacy-policy" className="text-[#E2C87A] hover:underline">Privacy Policy</Link>.
              </p>
              <div className="mt-3 space-y-1.5 text-xs text-white/50">
                <div className="p-2 bg-white/5 rounded"><span className="text-white/80 font-medium">Essential</span> — authentication, security, sessions. Cannot be disabled.</div>
                <div className="p-2 bg-white/5 rounded"><span className="text-white/80 font-medium">Analytics</span> — anonymised usage data to improve the site.</div>
                <div className="p-2 bg-white/5 rounded"><span className="text-white/80 font-medium">Functional</span> — remembers your preferences.</div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button size="sm" className="bg-[#E2C87A] text-[#1a0209] hover:bg-[#d4b665] text-xs h-7 font-semibold tracking-wider uppercase" onClick={acceptAll}>Accept All</Button>
                <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10 text-xs h-7" onClick={acceptEssential}>Essential Only</Button>
                <button className="text-white/50 hover:text-white/80 text-xs underline ml-auto" onClick={() => setShowDetails(false)}>Hide details</button>
              </div>
            </div>
            <button aria-label="Dismiss cookie notice" className="text-white/40 hover:text-white" onClick={acceptEssential}><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1a0209]/95 backdrop-blur-xl border-t border-[#E2C87A]/15">
      <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center gap-3 flex-wrap">
        <Shield className="w-3.5 h-3.5 text-[#E2C87A] flex-shrink-0" />
        <p className="text-white/70 text-[11px] leading-snug flex-1 min-w-[220px]">
          We use cookies for essential functions and to improve your experience. <Link href="/privacy-policy" className="text-[#E2C87A] hover:underline">Privacy</Link>.
        </p>
        <button className="text-white/45 hover:text-white/80 text-[11px] underline" onClick={() => setShowDetails(true)}>Manage</button>
        <Button size="sm" variant="outline" className="border-white/20 text-white/85 hover:bg-white/10 text-[11px] h-7 px-3" onClick={acceptEssential}>Essential</Button>
        <Button size="sm" className="bg-[#E2C87A] text-[#1a0209] hover:bg-[#d4b665] text-[11px] h-7 px-3 font-semibold tracking-wider uppercase" onClick={acceptAll}>Accept</Button>
        <button aria-label="Dismiss" className="text-white/40 hover:text-white ml-1" onClick={acceptEssential}><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
