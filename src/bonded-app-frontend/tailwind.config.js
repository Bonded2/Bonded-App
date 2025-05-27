/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2C4CDF", // Bonded Deep Blue
          foreground: "#FFFFFF",
          50: "#EEF2FF",
          100: "#E0E7FF", 
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#2C4CDF",
          600: "#2342C8",
          700: "#1E3A8A",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        secondary: {
          DEFAULT: "#FF704D", // Bonded Orange
          foreground: "#FFFFFF",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#FF704D",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        accent: {
          DEFAULT: "#B9FF46", // Bonded Neon Green
          foreground: "#000000",
          50: "#F7FFE6",
          100: "#EDFFC7",
          200: "#DCFF94",
          300: "#C8FF56",
          400: "#B9FF46",
          500: "#9EE41B",
          600: "#7AB212",
          700: "#5B8914",
          800: "#4A6B17",
          900: "#3F5A19",
        },
        success: {
          DEFAULT: "#8BC9BA", // Bonded Mid Green
          foreground: "#000000",
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#8BC9BA",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        destructive: {
          DEFAULT: "#FF5830", // Bonded Red
          foreground: "#FFFFFF",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#FF5830",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#000000",
        },
        info: {
          DEFAULT: "#1E8CFC", // Bonded Blue
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand specific colors
        bonded: {
          blue: "#2C4CDF",
          orange: "#FF704D",
          "orange-screen": "#FF704D",
          "deep-blue": "#2C4CDF", 
          "deep-red": "#9F341B",
          "mid-green": "#8BC9BA",
          "neon-green": "#B9FF46",
          red: "#FF5830",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        'trocchi': ['Trocchi', 'serif'],
        'rethink': ['Rethink Sans', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'sans': ['Rethink Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'serif': ['Trocchi', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        'h1': ['24px', { lineHeight: 'normal', fontWeight: '400', letterSpacing: '0px' }],
        'h2': ['18px', { lineHeight: 'normal', fontWeight: '400', letterSpacing: '0px' }],
        'h3': ['16px', { lineHeight: '23px', fontWeight: '400', letterSpacing: '0.2px' }],
        'h3-bold': ['16px', { lineHeight: '23px', fontWeight: '800', letterSpacing: '1.1px' }],
        'h4': ['16px', { lineHeight: 'normal', fontWeight: '400', letterSpacing: '0px' }],
        'h5': ['14px', { lineHeight: '24px', fontWeight: '400', letterSpacing: '0.1px' }],
        'h6': ['11px', { lineHeight: '18px', fontWeight: '400', letterSpacing: '0.1px' }],
        'body-large': ['16px', { lineHeight: '24px', fontWeight: '400', letterSpacing: '0.5px' }],
        'body-small': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.4px' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'elevation-2dp': '0px 0.85px 3px 0px rgba(0, 0, 0, 0.19), 0px 0.25px 1px 0px rgba(0, 0, 0, 0.04)',
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-bottom": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "slideDown": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slideInRight": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "entrance": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "60%": { transform: "scale(1.1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-circle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "shimmer": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "0.8" },
        },
        "slideUp": {
          "0%": { transform: "translate(-50%, 100%)", opacity: "0" },
          "100%": { transform: "translate(-50%, 0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "slide-out-to-bottom": "slide-out-to-bottom 0.3s ease-out",
        "slideDown": "slideDown 0.3s ease-out",
        "slideInRight": "slideInRight 0.5s ease-out forwards",
        "entrance": "entrance 1.5s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "float-circle": "float-circle 8s ease-in-out infinite",
        "rotate": "rotate 10s linear infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "slideUp": "slideUp 0.3s ease-out",
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}