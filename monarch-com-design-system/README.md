# www.monarch.com — design system pack

> Built from `https://www.monarch.com/for-couples` on 2026-05-07 by [designlang](https://designlang.app) v12.4.0.

A single, polished bundle of every artifact designlang emits for www.monarch.com: tokens, components, a runnable Storybook, a minimal starter, and paste-ready prompts for v0 / Lovable / Cursor / Claude Artifacts.

## At a glance

- **Grade:** B (81/100)
- **Stack:** next · component library: tailwindcss
- **Type families:** ABC Oracle, ui-sans-serif, Helvetica
- **Palette:** 9 colors
- **Spacing base:** 2

## What's in this pack

```
www-monarch-com-design-system/
├── README.md           ← you are here
├── LICENSE.txt
├── tokens/             ← DTCG + Tailwind + CSS vars + Figma vars + motion + theme.js
├── components/         ← typed React stubs (anatomy.tsx)
├── storybook/          ← runnable Storybook project
├── starter/            ← minimal starter app
├── prompts/            ← v0 · Lovable · Cursor · Claude Artifacts
└── extras/             ← voice fingerprint + recipe cards
```

## Install the tokens

### Tailwind

```js
// tailwind.config.js
import config from './tokens/tailwind.config.js';
export default config;
```

### CSS variables

```html
<link rel="stylesheet" href="tokens/variables.css">
```

### Figma

In Figma → Variables panel → import `tokens/figma-variables.json`.

### Storybook

```bash
cd storybook && npm install && npm run storybook
```

## Provenance

This pack was extracted from a publicly-accessible URL and represents the *observable design language* of that site at the time of capture. Token values are inferred from computed styles — no source files were accessed. See `LICENSE.txt` for usage guidance.

Re-pack at any time:

```bash
npx designlang pack www.monarch.com
```
