/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(17, 100%, 97%)',
            '100': 'hsl(17, 100%, 94%)',
            '200': 'hsl(17, 100%, 86%)',
            '300': 'hsl(17, 100%, 76%)',
            '400': 'hsl(17, 100%, 64%)',
            '500': 'hsl(17, 100%, 50%)',
            '600': 'hsl(17, 100%, 40%)',
            '700': 'hsl(17, 100%, 32%)',
            '800': 'hsl(17, 100%, 24%)',
            '900': 'hsl(17, 100%, 16%)',
            '950': 'hsl(17, 100%, 10%)',
            DEFAULT: '#ff692d'
        },
        secondary: {
            '50': 'hsl(40, 14%, 97%)',
            '100': 'hsl(40, 14%, 94%)',
            '200': 'hsl(40, 14%, 86%)',
            '300': 'hsl(40, 14%, 76%)',
            '400': 'hsl(40, 14%, 64%)',
            '500': 'hsl(40, 14%, 50%)',
            '600': 'hsl(40, 14%, 40%)',
            '700': 'hsl(40, 14%, 32%)',
            '800': 'hsl(40, 14%, 24%)',
            '900': 'hsl(40, 14%, 16%)',
            '950': 'hsl(40, 14%, 10%)',
            DEFAULT: '#f6f5f3'
        },
        accent: {
            '50': 'hsl(19, 90%, 97%)',
            '100': 'hsl(19, 90%, 94%)',
            '200': 'hsl(19, 90%, 86%)',
            '300': 'hsl(19, 90%, 76%)',
            '400': 'hsl(19, 90%, 64%)',
            '500': 'hsl(19, 90%, 50%)',
            '600': 'hsl(19, 90%, 40%)',
            '700': 'hsl(19, 90%, 32%)',
            '800': 'hsl(19, 90%, 24%)',
            '900': 'hsl(19, 90%, 16%)',
            '950': 'hsl(19, 90%, 10%)',
            DEFAULT: '#f35b16'
        },
        'neutral-50': '#dcd9d6',
        'neutral-100': '#22201d',
        'neutral-200': '#000000',
        'neutral-300': '#ffffff',
        'neutral-400': '#777573',
        'neutral-500': '#363431',
        background: '#f6f5f3',
        foreground: '#000000',
        app: {
            sidebar: '#f8f8f8',
            surface: '#f8f8f8',
            card: '#ffffff',
            border: '#e0e0e0',
            mutedText: '#909090',
            subtleText: '#a0a0a0',
            divider: '#d8d8d8',
            link: '#24a6bf',
            ctaSoft: '#f8b0a0',
            ctaSoftHover: '#f8c8b8'
        },
        dataviz: {
            line: '#24a6bf',
            lineSoft: '#d0e8f0',
            positive: '#2daf6f',
            positiveSoft: '#d0e8d8',
            finance: '#9b5bc6',
            financeSoft: '#e0d0f0',
            warning: '#f2c94c',
            negative: '#e66774'
        }
    },
    fontFamily: {
        body: [
            'Helvetica',
            'sans-serif'
        ],
        heading: [
            'Copernicus',
            'sans-serif'
        ]
    },
    fontSize: {
        '12': [
            '12px',
            {
                lineHeight: '15px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '20px'
            }
        ],
        '15': [
            '15px',
            {
                lineHeight: '20px',
                letterSpacing: '-0.18px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '18': [
            '18px',
            {
                lineHeight: '25.2px',
                letterSpacing: '-0.18px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '28px'
            }
        ],
        '32': [
            '32px',
            {
                lineHeight: '38.4px',
                letterSpacing: '-1.6px'
            }
        ],
        '40': [
            '40px',
            {
                lineHeight: '48px',
                letterSpacing: '-2.4px'
            }
        ]
    },
    spacing: {
        '16': '32px',
        '20': '40px',
        '24': '48px',
        '32': '64px',
        '36': '72px',
        '40': '80px',
        '64': '128px',
        '95': '190px',
        '3px': '3px'
    },
    borderRadius: {
        lg: '12px',
        full: '9999px'
    },
    boxShadow: {
        sm: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px',
        xs: 'rgb(204, 204, 204) 0px 0px 2px 2px'
    },
    screens: {
        xs: '376px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
    },
    transitionDuration: {
        '0': '0s',
        '50': '0.05s',
        '80': '0.08s',
        '100': '0.1s',
        '150': '0.15s',
        '160': '0.16s',
        '200': '0.2s',
        '300': '0.3s',
        '400': '0.4s',
        '700': '0.7s',
        '1500': '1.5s',
        '2000': '2s'
    },
    transitionTimingFunction: {
        default: 'ease',
        linear: 'linear',
        custom: 'cubic-bezier(0.075, 0.82, 0.165, 1)'
    },
    container: {
        center: true,
        padding: '0px'
    },
    maxWidth: {
        container: '320px'
    }
},
  },
};
