import { useState, useEffect } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState("cozy");

  useEffect(() => {
    const saved = localStorage.getItem("fp_theme") || "cozy";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = (originX, originY) => {
    const next = theme === "cozy" ? "y2k" : "cozy";

    const apply = () => {
      setTheme(next);
      localStorage.setItem("fp_theme", next);
      document.documentElement.setAttribute("data-theme", next);
    };

    if (typeof document === "undefined" || !document.startViewTransition) {
      apply();
      return;
    }

    const x = originX ?? window.innerWidth  / 2;
    const y = originY ?? window.innerHeight / 2;
    document.documentElement.style.setProperty("--vt-x", `${x}px`);
    document.documentElement.style.setProperty("--vt-y", `${y}px`);
    document.startViewTransition(apply);
  };

  return { theme, toggleTheme, isY2K: theme === "y2k" };
}
