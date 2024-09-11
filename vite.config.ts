import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

function CustomHmr() {
  return {
    name: 'custom-hmr',
    enforce: 'post',
    // HMR
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.json')) {
        console.log('reloading json file...');

        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

// @ts-ignore
export default defineConfig((...args) => {
  const rootPath = '../';

  const config = {
    plugins: [
      tsconfigPaths({
        projects: [rootPath + 'tsconfig.vite.json'],
      }),
      CustomHmr(),
    ],
    root: '.',
    base: '/',
    publicDir: path.resolve(__dirname, '.'),
    build: {
      outDir: rootPath + 'dist',
      assetsDir: 'release',
      cssCodeSplit: false,
    },
    server: {
      port: '3025',
      host: '0.0.0.0',
      // open: '/',
    },
  };
  return config;
});
