/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        darb: {
          green: "#0F3D2E",
          beige: "#E7DCC9",
          gold: "#C8A97E",
          black: "#1C1C1C",
          cream: "#F7F1E6",
          surface: "#EFE6D7",
          muted: "#8B8173",
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 61, 46, 0.12)",
      },
    },
  },
  plugins: [],
};
