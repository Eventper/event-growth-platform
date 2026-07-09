import { useEffect } from "react";

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  ogType?: "website" | "event" | "article" | "product" | "video.other";
  jsonLd?: any[];
  noIndex?: boolean;
  geoRegion?: string;
  geoPlacename?: string;
  geoPosition?: string;
  icbm?: string;
}

const DEFAULT_IMAGE = "https://eventperfekt.net/assets/iamher-hero-home.png";
const DEFAULT_IMAGE_ALT = "The Woman Who Leads the Room — a luxury leadership wellbeing experience for founders, executives, and women who lead, in Milton Keynes";
const DEFAULT_KEYWORDS = "Event Perfekt, I Am Her, The Woman Who Leads the Room, leadership wellbeing, women leaders, founders, executives, Milton Keynes, luxury leadership experience";
const SITE_NAME = "Event Perfekt";
const ORG_NAME = "Event Perfekt Global Ltd";
const BASE_URL = "https://eventperfekt.net";

export function usePageSEO(config: PageSEOConfig) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = config.title;

    const snapshots: Array<{
      selector: string;
      attr: string;
      prev: string | null;
      created: boolean;
      el: Element;
    }> = [];

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as
        | HTMLMetaElement
        | HTMLLinkElement
        | null;
      let created = false;
      if (!el) {
        el = document.createElement(
          selector.startsWith("link") ? "link" : "meta",
        ) as any;
        const [, key, val] = selector.match(/\[(.+?)="(.+?)"\]/) || [];
        if (key && val) el!.setAttribute(key, val);
        document.head.appendChild(el!);
        created = true;
      }
      snapshots.push({
        selector,
        attr,
        prev: el!.getAttribute(attr),
        created,
        el: el!,
      });
      el!.setAttribute(attr, value);
    };

    const desc = config.description;
    const kw = config.keywords || DEFAULT_KEYWORDS;
    const url = config.url || BASE_URL;
    const image = config.image || DEFAULT_IMAGE;
    const imageAlt = config.imageAlt || DEFAULT_IMAGE_ALT;
    const ogType = config.ogType || "website";
    const robots = config.noIndex
      ? "noindex, nofollow"
      : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

    // Core meta
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[name="viewport"]', "content", "width=device-width, initial-scale=1.0");
    setMeta('meta[name="keywords"]', "content", kw);
    setMeta('meta[name="robots"]', "content", robots);
    setMeta('meta[name="googlebot"]', "content", robots);
    setMeta('meta[name="bingbot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large");
    setMeta('meta[name="yahoobot"]', "content", robots);
    setMeta('meta[name="slurp"]', "content", robots);
    setMeta('meta[name="msnbot"]', "content", robots);
    setMeta('meta[name="author"]', "content", ORG_NAME);
    setMeta('meta[name="publisher"]', "content", ORG_NAME);
    setMeta('meta[name="copyright"]', "content", `${ORG_NAME} \u00a9 ${new Date().getFullYear()}`);
    // Geo tags — I Am Her routes only, set per-page via config
    if (config.geoRegion) {
      setMeta('meta[name="geo.region"]', "content", config.geoRegion);
      setMeta('meta[name="geo.placename"]', "content", config.geoPlacename || "");
      setMeta('meta[name="geo.position"]', "content", config.geoPosition || "");
      setMeta('meta[name="ICBM"]', "content", config.icbm || "");
    }
    setMeta('link[rel="canonical"]', "href", url);

    // Open Graph
    setMeta('meta[property="og:site_name"]', "content", SITE_NAME);
    setMeta('meta[property="og:locale"]', "content", "en_GB");
    setMeta('meta[property="og:title"]', "content", config.title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:image:alt"]', "content", imageAlt);
    setMeta('meta[property="og:image:width"]', "content", "1200");
    setMeta('meta[property="og:image:height"]', "content", "630");
    setMeta('meta[property="og:type"]', "content", ogType);

    // Twitter
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:site"]', "content", "@eventperfekt");
    setMeta('meta[name="twitter:creator"]', "content", "@eventperfekt");
    setMeta('meta[name="twitter:title"]', "content", config.title);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", image);
    setMeta('meta[name="twitter:image:alt"]', "content", imageAlt);

    // Language
    document.documentElement.lang = "en-GB";

    // JSON-LD
    const ldId = "page-jsonld-" + Math.random().toString(36).slice(2, 8);
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;

    const baseLd = config.jsonLd || [];
    const orgLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: ORG_NAME,
      url: "https://www.eventperfekt.com",
      logo: `${BASE_URL}/assets/3d%20Logo%20(1)_1754249114645.jpg`,
      sameAs: [
        "https://www.eventperfekt.com",
        "https://eventperfekt.net",
        "https://tradenow.thetwintrade.co.uk",
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "20 Wenlock Road",
        addressLocality: "London",
        postalCode: "N1 7PG",
        addressCountry: "GB",
      },
    };

    ld.text = JSON.stringify([orgLd, ...baseLd]);
    document.head.appendChild(ld);

    // Title tag
    const titleTagId = "page-title-tag-" + Math.random().toString(36).slice(2, 8);
    const titleTag = document.createElement("title");
    titleTag.id = titleTagId;
    titleTag.textContent = config.title;
    document.head.appendChild(titleTag);

    return () => {
      document.title = prevTitle;
      document.getElementById(ldId)?.remove();
      document.getElementById(titleTagId)?.remove();
      for (const s of snapshots) {
        if (s.created) s.el.parentNode?.removeChild(s.el);
        else if (s.prev === null) s.el.removeAttribute(s.attr);
        else s.el.setAttribute(s.attr, s.prev);
      }
    };
  }, [config.title, config.description, config.keywords, config.url, config.image, config.imageAlt, config.ogType]);
}
