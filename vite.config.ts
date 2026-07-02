import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/coca-word-frequency-tool/',
  plugins: [react()],
});
