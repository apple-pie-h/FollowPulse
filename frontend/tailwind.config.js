/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#020617",
        panel: "#0f172a",
        neon: "#22d3ee",
        violet: "#38bdf8",
        ember: "#fb7185",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 211, 238, 0.18), 0 20px 60px rgba(2, 132, 199, 0.18)",
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0px)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        fadeUp: "fadeUp 0.5s ease forwards",
      },
    },
  },
  plugins: [],
};
