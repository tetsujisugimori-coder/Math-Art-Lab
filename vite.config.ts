import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Keep development/source-module tests at /; build and preview use Pages' path.
  base: command === 'build' || isPreview ? '/Math-Art-Lab/' : '/',
}));
