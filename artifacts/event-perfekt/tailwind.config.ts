import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "#ffffff", // Page background
        foreground: "#000000", // ✅ Default text color black
        card: {
          DEFAULT: "#ffffff", // Card background
          foreground: "#000000", // ✅ Card text black
        },
        popover: {
          DEFAULT: "#ffffff", // Popover background
          foreground: "#000000", // ✅ Popover text black
        },
        primary: {
          DEFAULT: "#330311", // Deep burgundy
          foreground: "#ffffff", // White text on burgundy
        },
        secondary: {
          DEFAULT: "#f3f4f6", // Light grey background
          foreground: "#000000", // Black text
        },
        muted: {
          DEFAULT: "#f9fafb", // Light grey muted background
          foreground: "#000000", // ✅ Black text
        },
        accent: {
          DEFAULT: "#f3f4f6", // Light grey accent
          foreground: "#000000", // ✅ Black text
        },
        destructive: {
          DEFAULT: "#dc2626", // Red
          foreground: "#ffffff",
        },
        border: "#e5e7eb", // Light grey border
        input: "#d1d5db", // Input border - visible grey
        ring: "#330311", // Burgundy focus ring
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // ✅ Burgundy palette for Tailwind usage
        burgundy: {
          50: '#fdf6f8',
          100: '#fbe6ea',
          200: '#f5ccd4',
          300: '#eda3b0',
          400: '#e17688',
          500: '#c94b63',
          600: '#a82f49',
          700: '#872437',
          800: '#641a28',
          900: '#330311' // Deep Burgundy - brand colour
        },
        // ✅ Gold palette for accent elements
        gold: {
          50: '#fffdf2',
          100: '#fffbeb',
          200: '#fef3c7',
          300: '#fde68a',
          400: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f'
        }
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
} satisfies Config;