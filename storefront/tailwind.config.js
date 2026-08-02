/** @type {import('tailwindcss').Config} */
export default {
  // COPIED FROM apps/canvas SO THE STOREFRONT LOOKS IDENTICAL. The page moved out of the
  // platform; its appearance did not. Tailwind only generates classes it can see, and the
  // theme extensions below (the `float` keyframes especially) are what the hero relies on.
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        'gradient-x': 'gradient-x 3s ease infinite',
        'gradient-y': 'gradient-y 4s ease infinite',
        'gradient-xy': 'gradient-xy 4s ease infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
        'scan': 'scan 1.5s ease-in-out infinite',
        // Marketplace hero: package logos drifting around the headline.
        'float': 'float 7s ease-in-out infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-11px)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '400% 400%',
            'background-position': 'center bottom'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': '0% 50%'
          },
          '50%': {
            'background-size': '400% 400%',
            'background-position': '100% 50%'
          }
        },
        'glow': {
          '0%, 100%': {
            'box-shadow': '0 0 5px rgba(59, 130, 246, 0.2), 0 0 10px rgba(59, 130, 246, 0.1)'
          },
          '50%': {
            'box-shadow': '0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.15)'
          }
        },
        'shimmer': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          }
        },
        'scan': {
          '0%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(100%)'
          },
          '100%': {
            transform: 'translateY(0)'
          }
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
