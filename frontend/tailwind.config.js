/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#91191C",
          secondary: "#242A52",
          cta: "#ED145B",
          neutral: "#F5F5F5",
          offwhite: "#FDF9FD",
          text: "#333333",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(36, 42, 82, 0.12)",
        glass: "0 18px 38px rgba(12, 13, 30, 0.22)",
      },
      backgroundImage: {
        halo:
          "radial-gradient(circle at 10% 20%, rgba(145, 25, 28, 0.18), transparent 40%), radial-gradient(circle at 88% 16%, rgba(237, 20, 91, 0.2), transparent 38%)",
      },
    },
  },
};
