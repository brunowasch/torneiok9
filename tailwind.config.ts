import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
            },
        },
    },
};

export default config;