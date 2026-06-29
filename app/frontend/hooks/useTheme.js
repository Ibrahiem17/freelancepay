import { useState, useEffect } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "cozy";
    return localStorage.getItem("fp_theme") || "cozy";
  });

  const toggleTheme = () => {
    const next = theme === "cozy" ? "y2k" : "cozy";
    setTheme(next);
    localStorage.setItem("fp_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, toggleTheme, isY2K: theme === "y2k" };
}
