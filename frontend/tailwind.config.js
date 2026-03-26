/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        // shadcn/ui tokens
        primary:     { DEFAULT: "var(--primary)",     foreground: "var(--primary-foreground)" },
        secondary:   { DEFAULT: "var(--secondary)",   foreground: "var(--secondary-foreground)" },
        muted:       { DEFAULT: "var(--muted)",       foreground: "var(--muted-foreground)" },
        popover:     { DEFAULT: "var(--popover)",     foreground: "var(--popover-foreground)" },
        card:        { DEFAULT: "var(--card)",        foreground: "var(--card-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border:      "var(--border)",
        input:       "var(--input)",
        ring:        "var(--ring)",
      },
      borderRadius: {
        xl:  "calc(var(--radius) + 4px)",
        lg:  "var(--radius)",
        md:  "calc(var(--radius) - 2px)",
        sm:  "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
