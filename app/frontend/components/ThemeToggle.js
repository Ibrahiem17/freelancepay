import useTheme from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme, isY2K } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${isY2K ? "theme-toggle--y2k" : "theme-toggle--cozy"}`}
      aria-label={isY2K ? "Switch to Cozy theme" : "Switch to Y2K Glass theme"}
    >
      <span className="theme-toggle__dot" />
      {isY2K ? "🌸 Cozy" : "Y2K Glass"}
    </button>
  );
}
