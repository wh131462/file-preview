/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'vfp-',
  important: '.vfp-root',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/**/*.{js,ts,vue}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
