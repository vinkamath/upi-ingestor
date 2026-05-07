# Prompt pack

Paste-ready prompts for www.monarch.com. Use the variant that matches your tool.

## v0.txt

```
Build a legal page with this exact visual language.
COLORS:
  #dcd9d6
  #22201d
  #000000
  #ffffff
  #f6f5f3
  #ff692d
  #777573
  #363431
  #f35b16
FONTS: [object Object], [object Object], [object Object], [object Object]
SPACING: 3, 32, 40, 48, 64, 72, 80, 128
RADIUS: 12, 50, 1000, 9999
SHADOWS: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px | rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px | rgb(204, 204, 204) 0px 0px 2px 2px
MATERIAL LANGUAGE: flat
VOICE: Tone: friendly · Headings: Sentence case · CTA verbs: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]
LIBRARY: Use plain Tailwind CSS without a component library.
SECTIONS (in order):
- feature-grid
- testimonial — heading: "Stay on the same page about money"
- feature-grid — heading: "Your entire household in a single dashboard"
- cta — heading: "More ways to collaborate with Monarch"
- testimonial — heading: ""We like Monarch because you can customize your dashboard, choosing what you wan"
- faq — heading: "FAQ"
- cta — heading: "Track, budget, and feel good about your money with Monarch in your corner."
- footer
Use Tailwind. Match these tokens exactly. Keep the material language consistent.
```

## lovable.txt

```
Clone the design language of this legal page and build a fresh equivalent.
Visual feel: flat. Tone: friendly · Headings: Sentence case · CTA verbs: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]
Primary palette: #dcd9d6, #22201d, #000000, #ffffff, #f6f5f3.
Typography: [object Object], [object Object], [object Object], [object Object].
Corner radius vocabulary: 12, 50, 1000, 9999.
Shadow vocabulary: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px | rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px | rgb(204, 204, 204) 0px 0px 2px 2px.
Use: Use plain Tailwind CSS without a component library.
Page structure:
- feature-grid
- testimonial — heading: "Stay on the same page about money"
- feature-grid — heading: "Your entire household in a single dashboard"
- cta — heading: "More ways to collaborate with Monarch"
- testimonial — heading: ""We like Monarch because you can customize your dashboard, choosing what you wan"
- faq — heading: "FAQ"
- cta — heading: "Track, budget, and feel good about your money with Monarch in your corner."
- footer
```

## cursor.md

```
# Design brief
Page type: **legal**.
Material language: **flat**.
Voice: Tone: friendly · Headings: Sentence case · CTA verbs: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object].
## Tokens
```ts
export const tokens = {
  colors: ['#dcd9d6', '#22201d', '#000000', '#ffffff', '#f6f5f3', '#ff692d', '#777573', '#363431', '#f35b16'],
  fonts: ['[object Object]', '[object Object]', '[object Object]', '[object Object]'],
  radii: ['12', '50', '1000', '9999'],
  shadows: ['rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px', 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px', 'rgb(204, 204, 204) 0px 0px 2px 2px'],
};
```
## Sections
- feature-grid
- testimonial — heading: "Stay on the same page about money"
- feature-grid — heading: "Your entire household in a single dashboard"
- cta — heading: "More ways to collaborate with Monarch"
- testimonial — heading: ""We like Monarch because you can customize your dashboard, choosing what you wan"
- faq — heading: "FAQ"
- cta — heading: "Track, budget, and feel good about your money with Monarch in your corner."
- footer
## Library

Use plain Tailwind CSS without a component library.
```

## claude-artifacts.md

```
Create a React artifact that reproduces this brand's design language.
Page intent: legal.
Material language: flat.
Voice: Tone: friendly · Headings: Sentence case · CTA verbs: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object].
Library preference: Use plain Tailwind CSS without a component library.
Colors to use: #dcd9d6, #22201d, #000000, #ffffff, #f6f5f3, #ff692d, #777573, #363431, #f35b16.
Fonts: [object Object], [object Object], [object Object], [object Object].
Radius vocabulary: 12, 50, 1000, 9999.
Sections:
- feature-grid
- testimonial — heading: "Stay on the same page about money"
- feature-grid — heading: "Your entire household in a single dashboard"
- cta — heading: "More ways to collaborate with Monarch"
- testimonial — heading: ""We like Monarch because you can customize your dashboard, choosing what you wan"
- faq — heading: "FAQ"
- cta — heading: "Track, budget, and feel good about your money with Monarch in your corner."
- footer
Use Tailwind via CDN, lucide-react for icons, and keep the material language consistent across sections. Do not add extra decorative elements outside this vocabulary.
```

## Recipes

### button

# Recipe: button
Build one button component that matches this brand.
Palette: #dcd9d6, #22201d, #000000, #ffffff, #f6f5f3, #ff692d
Typography: [object Object], [object Object], [object Object], [object Object]
Material: flat
Signals: Use plain Tailwind CSS without a component library. · Radius: 12, 50, 1000, 9999 · Shadows: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px | rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px | rgb(204, 204, 204) 0px 0px 2px 2px
## Anatomy (detected)
```json
{
  "kind": "button",
  "structuralHash": "div>button>button",
  "instanceCount": 1,
  "variants": [
    {
      "css": {
        "background": "rgba(0, 0, 0, 0)",
        "color": "rgb(34, 32, 29)",
        "padding": "0px 0px 0px 0px",
        "borderRadius": "0px",
        "border": "0px solid rgb(220, 217, 214)",
        "fontSize": "16px",
        "fontWeight": "400"
      },
      "instanceCount": 1
    }
  ]
}
```


### button

# Recipe: button
Build one button component that matches this brand.
Palette: #dcd9d6, #22201d, #000000, #ffffff, #f6f5f3, #ff692d
Typography: [object Object], [object Object], [object Object], [object Object]
Material: flat
Signals: Use plain Tailwind CSS without a component library. · Radius: 12, 50, 1000, 9999 · Shadows: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px | rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px | rgb(204, 204, 204) 0px 0px 2px 2px
## Anatomy (detected)
```json
{
  "kind": "button",
  "structuralHash": "button",
  "instanceCount": 2,
  "variants": [
    {
      "css": {
        "background": "rgb(255, 255, 255)",
        "color": "rgb(34, 32, 29)",
        "padding": "6px 12px 6px 12px",
        "borderRadius": "1000px",
        "border": "1px solid rgb(220, 217, 214)",
        "fontSize": "12px",
        "fontWeight": "700"
      },
      "instanceCount": 2
    }
  ]
}
```


### button

# Recipe: button
Build one button component that matches this brand.
Palette: #dcd9d6, #22201d, #000000, #ffffff, #f6f5f3, #ff692d
Typography: [object Object], [object Object], [object Object], [object Object]
Material: flat
Signals: Use plain Tailwind CSS without a component library. · Radius: 12, 50, 1000, 9999 · Shadows: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.1) 0px 10px 15px -3px, rgba(34, 32, 29, 0.1) 0px 4px 6px -4px | rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(34, 32, 29, 0.05) 0px 1px 2px 0px | rgb(204, 204, 204) 0px 0px 2px 2px
## Anatomy (detected)
```json
{
  "kind": "button",
  "structuralHash": "button>svg",
  "instanceCount": 5,
  "variants": [
    {
      "css": {
        "background": "rgba(0, 0, 0, 0)",
        "color": "rgb(34, 32, 29)",
        "padding": "0px 0px 0px 0px",
        "borderRadius": "50%",
        "border": "2px solid rgba(0, 0, 0, 0)",
        "fontSize": "16px",
        "fontWeight": "400"
      },
      "instanceCount": 4
    },
    {
      "css": {
        "background": "rgba(0, 0, 0, 0)",
        "color": "rgb(34, 32, 29)",
        "padding": "8px 12px 8px 12px",
        "borderRadius": "9999px",
        "border": "0px solid rgb(220, 217, 214)",
        "fontSize": "14px",
        "fontWeight": "350"
      },
      "instanceCount": 1
    }
  ]
}
```

