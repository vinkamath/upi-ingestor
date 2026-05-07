import type { Preview } from '@storybook/react';
import './../stories/tokens.css';

const preview: Preview = {
  parameters: {
    backgrounds: { default: 'paper' },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};
export default preview;
