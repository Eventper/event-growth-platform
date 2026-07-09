import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "wouter";

const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

export interface IamherNavLink {
  label: string;
  href: string;
  active?: boolean;
}

export default function IamherMobileNav({
  links,
  logo,
  logoText,
  sticky = false,
  maxWidth = 900,
  headerPadding = "20px 24px",
}: {
  links: IamherNavLink[];
  logo?: string;
  logoText?: string;
  sticky?: boolean;
  maxWidth?: number | string;
  headerPadding?: string;
}) {
  const [open, setOpen] = useState(false);

  const logoArea = (
    <Link to="/iamher" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center" }}>
      {logo ? (
        <img src={logo} alt="Event Perfekt" style={{ height: 44, borderRadius: 8, objectFit: "contain" }} />
      ) : logoText ? (
        <span style={{ fontSize: 13, color: GOLD, fontWeight: 600, letterSpacing: "0.1em", fontFamily: "'Playfair Display', serif" }}>
          {logoText}
        </span>
      ) : null}
    </Link>
  );

  const desktopNav = (
    <nav className="iamher-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          style={{
            fontSize: 11,
            color: link.active ? GOLD : "rgba(244,236,216,0.65)",
            textDecoration: "none",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transition: "color 0.2s",
            borderBottom: "1px solid transparent",
            paddingBottom: 2,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = GOLD;
            e.currentTarget.style.borderBottomColor = "rgba(201,169,97,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = link.active ? GOLD : "rgba(244,236,216,0.65)";
            e.currentTarget.style.borderBottomColor = "transparent";
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  const hamburgerBtn = (
    <button
      onClick={() => setOpen(true)}
      className="iamher-mobile-hamburger"
      style={{ background: "none", border: "none", color: IVORY, cursor: "pointer", padding: 8, display: "none" }}
      aria-label="Open menu"
    >
      <Menu size={24} />
    </button>
  );

  if (sticky) {
    return (
      <>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(51,3,17,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(201,169,97,0.08)",
            padding: headerPadding,
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
            {logoArea}
            {desktopNav}
            {hamburgerBtn}
          </div>
        </div>

        {open && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(51,3,17,0.98)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{ position: "absolute", top: 24, right: 24, background: "none", border: "none", color: IVORY, cursor: "pointer", padding: 8 }}
              aria-label="Close menu"
            >
              <X size={28} />
            </button>
            {logoArea}
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 18,
                  color: link.active ? GOLD : IVORY,
                  textDecoration: "none",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <style>{`
          .iamher-mobile-hamburger { display: none !important; }
          .iamher-desktop-nav { display: flex !important; }
          @media (max-width: 767px) {
            .iamher-mobile-hamburger { display: block !important; }
            .iamher-desktop-nav { display: none !important; }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <header
        style={{
          padding: headerPadding,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(244,236,216,0.06)",
          maxWidth,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {logoArea}
        {desktopNav}
        {hamburgerBtn}
      </header>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(51,3,17,0.98)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <button
            onClick={() => setOpen(false)}
            style={{ position: "absolute", top: 24, right: 24, background: "none", border: "none", color: IVORY, cursor: "pointer", padding: 8 }}
            aria-label="Close menu"
          >
            <X size={28} />
          </button>
          {logoArea}
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setOpen(false)}
              style={{
                fontSize: 18,
                color: link.active ? GOLD : IVORY,
                textDecoration: "none",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .iamher-mobile-hamburger { display: none !important; }
        .iamher-desktop-nav { display: flex !important; }
        @media (max-width: 767px) {
          .iamher-mobile-hamburger { display: block !important; }
          .iamher-desktop-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}
