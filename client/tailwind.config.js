/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: { colors: { hunter: { bg: "#080B12", panel: "#101521", card: "#141B2A", cyan: "#38BDF8", violet: "#8B5CF6" } } } },
  plugins: []
};
