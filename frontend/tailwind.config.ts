import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080b0f",
        foreground: "#f5f7fb",
        card: "#101318",
        border: "#252a33",
        primary: "#dbe7ff",
        secondary: "#171c24",
        accent: "#67e8f9",
        muted: "#8b93a4"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(0, 0, 0, 0.28)"
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at 20% 0%, rgba(29,78,216,.18), transparent 35%), radial-gradient(circle at 90% 100%, rgba(234,88,12,.15), transparent 30%), #080b0f"
      }
    },
  },
  plugins: [],
};

export default config;
