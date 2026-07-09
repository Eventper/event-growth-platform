import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function ApplicationConfirm() {
  const [, setLocation] = useLocation();
  usePageMeta({ title: "Application Confirmed | I Am Her", description: "Your place request has been received." });
  return <div className="min-h-screen bg-[#330311] text-white p-8"><h1>Thank you.</h1><p>Friday 30 October 2026, Milton Keynes.</p><button onClick={() => setLocation('/iamher')}>Return</button></div>;
}
