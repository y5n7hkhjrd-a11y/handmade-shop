/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Avocado green — primary brand color
        primary: {
          50: '#f4f7ea',
          100: '#e6eed3',
          200: '#cddda9',
          300: '#b0c97b',
          400: '#97b556',
          500: '#7fa345',
          600: '#668339',
          700: '#52692f',
          800: '#425428',
          900: '#384622',
        },
        // Avocado alias (semantic)
        avocado: {
          50: '#f4f7ea',
          100: '#e6eed3',
          200: '#cddda9',
          300: '#b0c97b',
          400: '#97b556',
          500: '#7fa345',
          600: '#668339',
          700: '#52692f',
          800: '#425428',
          900: '#384622',
        },
        // Mint green — secondary accent
        mint: {
          50: '#effaf5',
          100: '#d7f2e6',
          200: '#b2e5cf',
          300: '#87d5b4',
          400: '#5cc49d',
          500: '#3aad84',
          600: '#2c8c6b',
          700: '#257059',
          800: '#205a48',
          900: '#1c4b3c',
        },
      },
    },
  },
  plugins: [],
};
