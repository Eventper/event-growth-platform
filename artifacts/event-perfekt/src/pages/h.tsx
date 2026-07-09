import { useEffect } from "react";

export default function ShortForm() {
  useEffect(() => {
    window.location.href = "/access";
  }, []);
  return null;
}
