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
        'k9-orange': '#F97316',  
        'k9-black': '#1A1A1A',   
        'k9-white': '#FFFFFF',   
        'k9-gray': '#F3F4F6',     
        'k9-blue': '#2563EB',    
      },
      backgroundImage: {
      }
    },
  },
  plugins: [],
} satisfies Config;