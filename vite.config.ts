import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = decodeURIComponent(new URL('.', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: `${projectRoot}index.html`,
        kidsKathakBellevue: `${projectRoot}kids-kathak-bellevue/index.html`,
        kathakClassesRedmond: `${projectRoot}kathak-classes-redmond/index.html`,
        adultKathakBellevue: `${projectRoot}adult-kathak-bellevue/index.html`,
        trialClass: `${projectRoot}trial-class/index.html`,
        trialClassThankYou: `${projectRoot}trial-class/thank-you/index.html`,
      },
    },
  },
});
