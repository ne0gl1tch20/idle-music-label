import { defineConfig } from 'vite';

// Emit both the public landing page and the directly playable game.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        landing: 'index.html',
        play: 'play.html',
      },
    },
  },
});
