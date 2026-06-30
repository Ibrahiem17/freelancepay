import { useState, useEffect } from "react";

export default function useTheme() {
  // Always start with "cozy" so SSR and initial client render match (no hydration mismatch).
  // localStorage is read in useEffect, which only runs on the client after hydration.
  const [theme, setTheme] = useState("cozy");

  useEffect(() => {
    const saved = localStorage.getItem("fp_theme") || "cozy";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "cozy" ? "y2k" : "cozy";
    setTheme(next);
    localStorage.setItem("fp_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return { theme, toggleTheme, isY2K: theme === "y2k" };
}
