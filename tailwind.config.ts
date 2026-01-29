import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Custom Palette based on the poster
        'tactical-black': '#0a0a0a',
        'tactical-gray': '#1c1c1c',
        'police-gold': '#d4af37', 
        'police-dark-gold': '#b59024',
        'alert-red': '#8b0000',
      },
      backgroundImage: {
         'grunge-texture': "url('https://www.transparenttextures.com/patterns/black-felt.png')", // Optional subtle texture if needed later
      }
    },
  },
  plugins: [],
} satisfies Config;