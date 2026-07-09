import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string;
}

function setOrCreateMeta(selector: string, attr: string, value: string, tagName?: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el && tagName) {
    el = document.createElement(tagName) as HTMLMetaElement | HTMLLinkElement;
    if (tagName === "meta") {
      const meta = el as HTMLMetaElement;
      if (selector.includes('property="')) {
        meta.setAttribute("property", selector.match(/property="([^"]+)"/)?.[1] || "");
      } else if (selector.includes('name="')) {
        meta.setAttribute("name", selector.match(/name="([^"]+)"/)?.[1] || "");
      }
    } else if (tagName === "link") {
      const link = el as HTMLLinkElement;
      if (selector.includes('rel="')) {
        link.setAttribute("rel", selector.match(/rel="([^"]+)"/)?.[1] || "");
      }
    }
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

export function usePageMeta({ title, description, canonical, ogImage, ogType = "website", keywords }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes("Event Perfekt") ? title : `${title} | Event Perfekt`;
    document.title = fullTitle;

    // Basic meta
    setOrCreateMeta('meta[property="og:title"]', "content", fullTitle, "meta");
    setOrCreateMeta('meta[name="twitter:title"]', "content", fullTitle, "meta");

    if (description) {
      setOrCreateMeta('meta[name="description"]', "content", description, "meta");
      setOrCreateMeta('meta[property="og:description"]', "content", description, "meta");
      setOrCreateMeta('meta[name="twitter:description"]', "content", description, "meta");
    }

    if (keywords) {
      setOrCreateMeta('meta[name="keywords"]', "content", keywords, "meta");
    }

    // Canonical — fall back to current pathname when no explicit value provided
    const resolvedCanonical = canonical
      ? canonical
      : `https://eventperfekt.net${window.location.pathname.replace(/\/$/, "") || "/"}`;
    setOrCreateMeta('link[rel="canonical"]', "href", resolvedCanonical, "link");
    setOrCreateMeta('meta[property="og:url"]', "content", resolvedCanonical, "meta");

    // OG Image
    if (ogImage) {
      setOrCreateMeta('meta[property="og:image"]', "content", ogImage, "meta");
      setOrCreateMeta('meta[name="twitter:image"]', "content", ogImage, "meta");
      setOrCreateMeta('meta[property="og:image:alt"]', "content", title, "meta");
      setOrCreateMeta('meta[name="twitter:image:alt"]', "content", title, "meta");
    }

    // Robots — index, follow by default
    setOrCreateMeta('meta[name="robots"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1", "meta");
    setOrCreateMeta('meta[name="googlebot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1", "meta");
    setOrCreateMeta('meta[name="bingbot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large", "meta");

    // OG Type
    setOrCreateMeta('meta[property="og:type"]', "content", ogType, "meta");

    // Twitter card type
    setOrCreateMeta('meta[name="twitter:card"]', "content", "summary_large_image", "meta");
    setOrCreateMeta('meta[name="twitter:site"]', "content", "@eventperfekt", "meta");

    // OG Site
    setOrCreateMeta('meta[property="og:site_name"]', "content", "Event Perfekt", "meta");
    setOrCreateMeta('meta[property="og:locale"]', "content", "en_GB", "meta");

    return () => {
      document.title = "Event Perfekt — Professional Event Planning & Management | Making Yours Perfekt";
    };
  }, [title, description, canonical, ogImage, ogType, keywords]);
}
