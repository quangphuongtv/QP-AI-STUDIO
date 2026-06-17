import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Custom plugin to ensure static assets are correctly built and router pages are supported
function optimizationPlugin() {
  return {
    name: 'optimization-plugin',
    closeBundle() {
      // 1. Copy the assets folder into the built output (dist/assets) so that it works perfectly on Netlify/Vercel
      const srcDir = path.resolve(__dirname, 'assets');
      const destDir = path.resolve(__dirname, 'dist/assets');
      if (fs.existsSync(srcDir)) {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destDir, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }

      // 2. Output _redirects file for Netlify router compatibility
      const netlifyRedirectsPath = path.resolve(__dirname, 'dist/_redirects');
      fs.writeFileSync(netlifyRedirectsPath, '/* /index.html 200\n');
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), optimizationPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1500,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react-core';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('jspdf') || id.includes('docx') || id.includes('mammoth') || id.includes('pdfjs-dist') || id.includes('file-saver')) {
                return 'vendor-documents';
              }
              if (id.includes('wavesurfer.js')) {
                return 'vendor-audio';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              return 'vendor-other';
            }
          }
        }
      }
    },
  };
});
