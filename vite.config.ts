import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

function cpanelAutoSyncPlugin(): Plugin {
  return {
    name: 'vite-plugin-cpanel-auto-sync',
    apply: 'build',
    closeBundle() {
      try {
        const buildTs = Date.now();
        const distDir = path.resolve(__dirname, 'dist');
        const clientBuildDir = path.resolve(__dirname, 'client-build');
        const rootAssetsDir = path.resolve(__dirname, 'assets');
        const tmpDir = path.resolve(__dirname, 'tmp');

        // 1. Stamp dist/index.html with build timestamp marker so server.ts always knows the newest build
        const distIndexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(distIndexPath)) {
          let html = fs.readFileSync(distIndexPath, 'utf-8');
          const marker = `<!-- SPINEL_BUILD_TS:${buildTs} -->`;
          if (html.includes('SPINEL_BUILD_TS:')) {
            html = html.replace(/<!-- SPINEL_BUILD_TS:\d+ -->/g, marker);
          } else {
            html = html.replace('</head>', `  ${marker}\n  </head>`);
          }
          fs.writeFileSync(distIndexPath, html, 'utf-8');
        }

        // 2. Sync dist/ to client-build/ cleanly (removing stale bundles first)
        if (fs.existsSync(distDir)) {
          if (fs.existsSync(clientBuildDir)) {
            fs.rmSync(clientBuildDir, {recursive: true, force: true});
          }
          fs.cpSync(distDir, clientBuildDir, {recursive: true});
        }

        // 3. Sync dist/assets/ to root assets/ so cPanel static or Passenger root resolution always has the latest hashed bundles
        const distAssetsDir = path.join(distDir, 'assets');
        if (fs.existsSync(distAssetsDir)) {
          if (fs.existsSync(rootAssetsDir)) {
            fs.rmSync(rootAssetsDir, {recursive: true, force: true});
          }
          fs.cpSync(distAssetsDir, rootAssetsDir, {recursive: true});
        }

        // 4. Bundle server.ts into app.js and server.cjs using esbuild
        execSync(
          'npx esbuild server.ts --bundle --platform=node --target=node18 --outfile=app.js --external:vite --external:fsevents --external:lightningcss --external:@tailwindcss/oxide --external:esbuild',
          {cwd: __dirname, stdio: 'inherit'},
        );
        const appJsPath = path.resolve(__dirname, 'app.js');
        const serverCjsPath = path.resolve(__dirname, 'server.cjs');
        if (fs.existsSync(appJsPath)) {
          fs.copyFileSync(appJsPath, serverCjsPath);
        }

        // 5. Touch tmp/restart.txt so Phusion Passenger immediately restarts on cPanel upload
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, {recursive: true});
        }
        fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(buildTs), 'utf-8');

        // 6. Regenerate cpanel-deploy.zip if scripts/pack-cpanel.js exists
        const packScript = path.resolve(__dirname, 'scripts', 'pack-cpanel.js');
        if (fs.existsSync(packScript)) {
          execSync('node scripts/pack-cpanel.js', {cwd: __dirname, stdio: 'inherit'});
        }

        console.log(`[cPanel Auto-Sync] Synced dist/, client-build/, assets/, app.js, server.cjs, and tmp/restart.txt (Build TS: ${buildTs})`);
      } catch (err) {
        console.error('[cPanel Auto-Sync] Warning during post-build sync:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), cpanelAutoSyncPlugin()],
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/xlsx') || id.includes('node_modules/papaparse')) {
              return 'vendor-sheets';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          }
        }
      }
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
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

