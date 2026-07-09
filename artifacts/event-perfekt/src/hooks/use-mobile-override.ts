import { useEffect } from "react";

/**
 * Dynamically applies mobile overrides by injecting a <style> tag
 * when the viewport is 640px or smaller. This is more reliable than
 * CSS attribute selectors because it targets the actual rendered DOM.
 */
export function useMobileOverride() {
  useEffect(() => {
    const MOBILE_CSS = `
      /* Mobile overrides injected at runtime */
      @media (max-width: 640px) {
        .mobile-fluid-container {
          max-width: 100vw !important;
          width: 100% !important;
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .mobile-fluid-flex {
          flex: none !important;
          width: 100% !important;
        }
        .mobile-hidden {
          display: none !important;
        }
        .mobile-hero-padding {
          padding: 30px 16px !important;
          min-height: 280px !important;
        }
        .mobile-header-padding {
          padding: 12px 16px !important;
        }
        .mobile-grid-1col {
          grid-template-columns: 1fr !important;
        }
        .mobile-banner-padding {
          padding: 50px 16px 40px !important;
        }
        .mobile-cta-padding {
          padding: 12px 16px !important;
        }
        .mobile-grid-padding {
          padding: 24px 16px 40px !important;
        }
        .mobile-reduce-padding {
          padding: 24px 16px !important;
        }
        .mobile-reduce-padding-sm {
          padding: 12px 16px !important;
        }
        .mobile-reduce-padding-lg {
          padding: 40px 16px !important;
        }
        .mobile-story-title {
          font-size: 14px !important;
        }
        .mobile-cat-pill {
          padding: 5px 10px !important;
          font-size: 9px !important;
          letter-spacing: 0.12em !important;
        }
        .mobile-nav-wrap {
          flex-wrap: wrap !important;
          gap: 6px !important;
          justify-content: center !important;
        }
        .mobile-nav-wrap > * {
          font-size: 10px !important;
          padding: 5px 8px !important;
        }
        .mobile-hero-text {
          font-size: 26px !important;
          line-height: 1.2 !important;
        }
        .mobile-hero-minh {
          min-height: auto !important;
        }
      }
    `;

    const existing = document.getElementById("mobile-override-style");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "mobile-override-style";
    style.textContent = MOBILE_CSS;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);
}
