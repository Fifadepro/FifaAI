import React from "react";

interface ThemeSwitchProps {
  theme: "dark" | "light";
  onToggle: () => void;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ theme, onToggle }) => {
  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-1.5" title={isLight ? "Włącz tryb ciemny" : "Włącz tryb jasny"}>
      <label className="switch cursor-pointer">
        <input
          type="checkbox"
          checked={isLight}
          onChange={onToggle}
          aria-label="Przełącznik trybu jasnego/ciemnego"
        />
        <span className="slider">
          {/* Stars (Night / Dark mode) */}
          <span className="star star_1"></span>
          <span className="star star_2"></span>
          <span className="star star_3"></span>

          {/* Cloud SVG (Day / Light mode) */}
          <svg
            className="cloud"
            viewBox="0 0 100 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 50H80C88.2843 50 95 43.2843 95 35C95 27.2091 89.0636 20.8044 81.4552 20.0822C79.8827 10.9704 71.9774 4 62.5 4C55.4526 4 49.2559 8.0163 46.2238 13.882C43.9056 12.0673 40.9796 11 37.8 11C29.6262 11 23 17.6262 23 25.8C23 26.6806 23.0768 27.5433 23.2244 28.3813C12.7842 29.4795 4.5 38.2721 4.5 49C4.5 49.5523 4.94772 50 5.5 50H20Z"
              fill="#ffffff"
              fillOpacity="0.95"
            />
          </svg>
        </span>
      </label>
    </div>
  );
};
