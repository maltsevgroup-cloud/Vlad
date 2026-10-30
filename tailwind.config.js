/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", sunk: "var(--sunk)", ink: "var(--ink)", mute: "var(--mute)", line: "var(--line)",
        accent: { DEFAULT: "var(--accent)", ink: "var(--accent-ink)", soft: "var(--accent-soft)" },
        mate: { DEFAULT: "var(--mate)", soft: "var(--mate-soft)" },
        good: { DEFAULT: "var(--good)", soft: "var(--good-soft)", ink: "var(--good-ink)" }, warn: "var(--warn)",
        border: "var(--line)", background: "var(--bg)", foreground: "var(--ink)",
      },
      fontFamily: { display: ["var(--font-display)"], body: ["var(--font-body)"] },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
