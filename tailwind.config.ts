import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
        },
        accent: { light: "#fef3c7", DEFAULT: "#f59e0b", dark: "#d97706" },
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgb(0 0 0 / 0.07), 0 10px 20px -2px rgb(0 0 0 / 0.04)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        cardHover: "0 4px 14px 0 rgb(0 0 0 / 0.08)",
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgb(0 0 0 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.03) 1px, transparent 1px)",
        "hero-gradient": "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)",
      },
      backgroundSize: { grid: "24px 24px" },
    },
  },
  plugins: [],
};
export default config;
