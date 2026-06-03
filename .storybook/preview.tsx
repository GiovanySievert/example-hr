import type { Preview } from '@storybook/nextjs-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'

import { handlers } from '../src/mocks/handlers'
import '../src/app/globals.css'

initialize({
  onUnhandledRequest: (request, print) => {
    const url = new URL(request.url)
    if (
      url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/node_modules/') ||
      /\.(css|js|mjs|ts|tsx|svg|png|jpe?g|webp|avif|woff2?)$/.test(url.pathname)
    ) {
      return
    }
    print.warning()
  },
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo'
    },

    msw: { handlers },
  },
  loaders: [mswLoader],
};

export default preview;
