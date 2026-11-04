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

        // 1. Stamp dist/index.html with build timestamp marker and cache-busting query strings
        const distIndexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(distIndexPath)) {
          let html = fs.readFileSync(distIndexPath, 'utf-8');
          const marker = `<!-- SPINEL_BUILD_TS:${buildTs} -->`;
          if (html.includes('SPINEL_BUILD_TS:')) {
            html = html.replace(/<!-- SPINEL_BUILD_TS:\d+ -->/g, marker);
          } else {
            html = html.replace('</head>', `  ${marker}\n  </head>`);
          }
          // Append cache-busting query param to deterministic /assets/*.js and /assets/*.css references
          html = html.replace(/(src|href)="(\/assets\/[^"?]+\.(?:js|css))(?:\?[^"]*)?"/g, `$1="$2?v=${buildTs}"`);
          fs.writeFileSync(distIndexPath, html, 'utf-8');
        }

        // 2. Copy .htaccess and Images/ into dist/ so both root and subdirectory deployments have all static files and zero-cache rules
        const rootHtaccess = path.resolve(__dirname, '.htaccess');
        if (fs.existsSync(rootHtaccess) && fs.existsSync(distDir)) {
          try {
            fs.copyFileSync(rootHtaccess, path.join(distDir, '.htaccess'));
          } catch {}
        }
        const rootImagesDir = path.resolve(__dirname, 'Images');
        if (fs.existsSync(rootImagesDir) && fs.existsSync(distDir)) {
          try {
            fs.cpSync(rootImagesDir, path.join(distDir, 'Images'), {recursive: true});
          } catch {}
        }

        // 3. Sync dist/ to client-build/ cleanly (removing stale hashed bundles first)
        if (fs.existsSync(distDir)) {
          if (fs.existsSync(clientBuildDir)) {
            fs.rmSync(clientBuildDir, {recursive: true, force: true});
          }
          fs.cpSync(distDir, clientBuildDir, {recursive: true});
        }

        // 4. Sync dist/assets/ to root assets/ cleanly (removing any old index-*.js hashed files)
        const distAssetsDir = path.join(distDir, 'assets');
        if (fs.existsSync(distAssetsDir)) {
          if (fs.existsSync(rootAssetsDir)) {
            fs.rmSync(rootAssetsDir, {recursive: true, force: true});
          }
          fs.cpSync(distAssetsDir, rootAssetsDir, {recursive: true});
        }

        // 5. Bundle server.ts into app.js and server.cjs using esbuild binary directly
        const esbuildBin = path.resolve(__dirname, 'node_modules', '.bin', 'esbuild');
        const esbuildCmd = fs.existsSync(esbuildBin) ? `"${esbuildBin}"` : 'npx esbuild';
        execSync(
          `${esbuildCmd} server.ts --bundle --platform=node --target=node18 --format=cjs --minify --outfile=app.js --external:vite --external:fsevents --external:lightningcss --external:@tailwindcss/oxide --external:esbuild`,
          {cwd: __dirname, stdio: 'inherit'},
        );
        const appJsPath = path.resolve(__dirname, 'app.js');
        const serverCjsPath = path.resolve(__dirname, 'server.cjs');
        if (fs.existsSync(appJsPath)) {
          fs.copyFileSync(appJsPath, serverCjsPath);
        }

        // 6. Touch tmp/restart.txt and build-version.json so Phusion Passenger and frontend live-watcher detect the update immediately
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, {recursive: true});
        }
        fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(buildTs), 'utf-8');
        const versionPayload = JSON.stringify({buildTs, updatedAt: new Date(buildTs).toISOString()}, null, 2);
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'build-version.json'), versionPayload, 'utf-8');
        }
        if (fs.existsSync(clientBuildDir)) {
          fs.writeFileSync(path.join(clientBuildDir, 'build-version.json'), versionPayload, 'utf-8');
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
          entryFileNames: 'assets/index.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
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

