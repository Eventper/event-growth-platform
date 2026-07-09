import { useEffect, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

interface FullScreenModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  dark?: boolean;
}

export function FullScreenModal({ open, onClose, title, children, dark = false }: FullScreenModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open) return null;

  const bg = dark ? "#0f172a" : "#ffffff";
  const text = dark ? "#f8fafc" : "#1e293b";
  const border = dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0";
  const closeHover = dark ? "rgba(255,255,255,0.12)" : "#f1f5f9";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "95vw",
          height: "95vh",
          background: bg,
          color: text,
          borderRadius: 16,
          border,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {(title != null) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: border,
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>{title}</div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: dark ? "rgba(255,255,255,0.5)" : "#64748b",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = closeHover)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
