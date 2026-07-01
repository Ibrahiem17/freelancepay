import useTheme from "../hooks/useTheme";

export default function ThemeToggle() {
  const { toggleTheme, isY2K } = useTheme();

  function handleClick(e) {
    const r = e.currentTarget.getBoundingClientRect();
    toggleTheme(r.left + r.width / 2, r.top + r.height / 2);
  }

  return (
    <button
      onClick={handleClick}
      className={`theme-toggle ${isY2K ? "theme-toggle--y2k" : "theme-toggle--cozy"}`}
      aria-label={isY2K ? "Switch to Cozy theme" : "Switch to Y2K Glass theme"}
      title={isY2K ? "Switch to Cozy" : "Switch to Y2K Glass"}
    >
      {isY2K ? "🌸" : "✦"}
    </button>
  );
}
