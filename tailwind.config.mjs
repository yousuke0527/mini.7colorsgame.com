/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',      // Slate 900
          card: '#1e293b',      // Slate 800
          accent: '#38bdf8',    // Sky 400
          primary: '#6366f1',   // Indigo 500
          success: '#10b981',   // Emerald 500
        }
      }
    },
  },
  plugins: [],
}
