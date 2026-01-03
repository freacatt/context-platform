import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--gray-1)",
        surface: "var(--gray-2)",
        "surface-hover": "var(--gray-3)",
        "surface-active": "var(--gray-4)",
        border: "var(--gray-6)",
        "border-hover": "var(--gray-7)",
        "border-active": "var(--gray-8)",
        foreground: "var(--gray-12)",
        "foreground-muted": "var(--gray-11)",
        // Inspired by reference image
        brand: {
          light: "#8257e5", // Lighter purple
          DEFAULT: "#6c5ce7", // Standard purple
          dark: "#5849be", // Darker purple
        }
      },
      borderRadius: {
        '3xl': '1.5rem', // Extra rounded for cards
      },
      fontFamily: {
        sans: ['"Ubuntu"', 'Inter'],
      }
    },
  },
  plugins: [
    typography,
  ],
}
