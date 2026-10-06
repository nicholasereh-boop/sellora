/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Storefront (light, warm paper)
        paper: "#F5F1E6",
        "paper-line": "#E4DCC8",
        ink: "#191510",
        "ink-soft": "#5C5646",
        // Dashboards ("control room"). Dark by default; the values come
        // from CSS variables (see index.css) so a dashboard can opt into
        // the light theme with the `dash-light` class (seller + rider).
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-line": "rgb(var(--c-surface-line) / <alpha-value>)",
        mist: "rgb(var(--c-mist) / <alpha-value>)",
        "mist-soft": "rgb(var(--c-mist-soft) / <alpha-value>)",
        // Brand
        indigo: {
          DEFAULT: "#3D3287",
          deep: "#241F5E",
        },
        marigold: "#E4A427",
        rust: "#C0472E",
        moss: "#3E8A5B",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
