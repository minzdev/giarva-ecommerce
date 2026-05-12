/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ocean: {
                    DEFAULT: '#7B8FA1',
                    50: '#f0f4f7',
                    100: '#d9e5ed',
                    200: '#b3cbdb',
                    300: '#8db1c9',
                    400: '#7B8FA1',
                    500: '#5e7a8e',
                    600: '#4a6272',
                    700: '#3a4e5a',
                    800: '#2a3a42',
                    900: '#1a252a',
                },
                gold: {
                    DEFAULT: '#C9A84C',
                    50: '#fdf8ec',
                    100: '#f9edcc',
                    200: '#f3d999',
                    300: '#ecc566',
                    400: '#C9A84C',
                    500: '#b08a2e',
                    600: '#8d6e22',
                    700: '#6a5219',
                    800: '#473710',
                    900: '#241b08',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
