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
        background: "#eef4ea",
        foreground: "#102218",
        card: "#f9fbf4",
        border: "#d5e2d1",
        primary: "#355f3b",
        secondary: "#d9e6d4",
        accent: "#7b9c5c",
        muted: "#5a6e5d"
      },
      boxShadow: {
        soft: "0 24px 50px rgba(16, 34, 24, 0.08)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(123,156,92,0.22), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.7), rgba(233,242,227,0.9))"
      }
    },
  },
  plugins: [],
};

export default config;
