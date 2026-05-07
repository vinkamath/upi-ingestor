// React Theme — extracted from https://www.monarch.com/for-couples
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
 *   };
 *   fonts: {
    body: string;
    heading: string;
 *   };
 *   fontSizes: {
    '12': string;
    '14': string;
    '15': string;
    '16': string;
    '18': string;
    '20': string;
    '32': string;
    '40': string;
 *   };
 *   space: {
    '3': string;
    '32': string;
    '40': string;
    '48': string;
    '64': string;
    '72': string;
    '80': string;
    '128': string;
    '190': string;
 *   };
 *   radii: {
    lg: string;
    full: string;
 *   };
 *   shadows: {
    sm: string;
    xs: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#ff692d",
    "secondary": "#f6f5f3",
    "accent": "#f35b16",
    "background": "#f6f5f3",
    "foreground": "#000000",
    "neutral50": "#dcd9d6",
    "neutral100": "#22201d",
    "neutral200": "#000000",
    "neutral300": "#ffffff",
    "neutral400": "#777573",
    "neutral500": "#363431"
  },
  "fonts": {
    "body": "'Helvetica', sans-serif",
    "heading": "'Copernicus', sans-serif"
  },
  "fontSizes": {
    "12": "12px",
    "14": "14px",
    "15": "15px",
    "16": "16px",
    "18": "18px",
    "20": "20px",
    "32": "32px",
    "40": "40px"
  },
  "space": {
    "3": "3px",
    "32": "32px",
    "40": "40px",
    "48": "48px",
    "64": "64px",
    "72": "72px",
    "80": "80px",
    "128": "128px",
    "190": "190px"
  },
  "radii": {
    "lg": "12px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px",
    "xs": "rgb(204, 204, 204) 0px 0px 2px 2px"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#ff692d",
      "light": "hsl(17, 100%, 74%)",
      "dark": "hsl(17, 100%, 44%)"
    },
    "secondary": {
      "main": "#f6f5f3",
      "light": "hsl(40, 14%, 95%)",
      "dark": "hsl(40, 14%, 81%)"
    },
    "background": {
      "default": "#f6f5f3",
      "paper": "#ffffff"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#22201d"
    }
  },
  "typography": {
    "fontFamily": "'ABC Oracle', sans-serif",
    "h1": {
      "fontSize": "32px",
      "fontWeight": "350",
      "lineHeight": "38.4px",
      "fontFamily": "'Copernicus', sans-serif"
    },
    "h3": {
      "fontSize": "20px",
      "fontWeight": "500",
      "lineHeight": "28px",
      "fontFamily": "'Copernicus', sans-serif"
    },
    "body1": {
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "24px"
    },
    "body2": {
      "fontSize": "15px",
      "fontWeight": "500",
      "lineHeight": "20px"
    }
  },
  "shape": {
    "borderRadius": 12
  },
  "shadows": [
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px",
    "rgb(204, 204, 204) 0px 0px 2px 2px"
  ]
};

export default theme;
