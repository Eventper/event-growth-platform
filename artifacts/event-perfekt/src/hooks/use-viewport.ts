import { useState, useEffect } from "react";

export function useViewport() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 640 : false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setWidth(w);
      setIsMobile(w <= 640);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { width, isMobile };
}
