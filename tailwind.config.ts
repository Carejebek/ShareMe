import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf4',
          100: '#d6fae3',
          500: '#0f9d58',
          600: '#0c7f47',
          700: '#0a6438'
        }
      }
    }
  },
  plugins: []
};

export default config;
