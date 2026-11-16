const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('[Production Build] Starting clean production build...');
console.log('====================================================');

const rootDir = process.cwd();

// Step 1: Wipe all old build directories to guarantee ZERO stale files
console.log('\n[1/6] Cleaning previous build artifacts...');
['dist', 'client-build', 'assets', 'cpanel-deploy.zip'].forEach(item => {
  const target = path.join(rootDir, item);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`  - Cleaned: ${item}`);
  }
});

// Step 2: Run Vite build for client SPA
console.log('\n[2/6] Compiling client frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit', cwd: rootDir });

if (!fs.existsSync(path.join(rootDir, 'dist', 'index.html'))) {
  throw new Error('Vite build did not produce dist/index.html');
}

// Step 3: Find generated main bundles and create deterministic alias copies
console.log('\n[3/6] Setting up deterministic asset aliases...');
const distAssetsDir = path.join(rootDir, 'dist', 'assets');
if (fs.existsSync(distAssetsDir)) {
  const assetFiles = fs.readdirSync(distAssetsDir);
  
  // Find main JS bundle (index-*.js)
  const mainJs = assetFiles.find(f => /^index-[A-Za-z0-9_-]+\.js$/.test(f));
  if (mainJs) {
    fs.copyFileSync(path.join(distAssetsDir, mainJs), path.join(distAssetsDir, 'index.js'));
    console.log(`  + Created deterministic alias: dist/assets/index.js -> ${mainJs}`);
  }

  // Find main CSS bundle (index-*.css)
  const mainCss = assetFiles.find(f => /^index-[A-Za-z0-9_-]+\.css$/.test(f));
  if (mainCss) {
    fs.copyFileSync(path.join(distAssetsDir, mainCss), path.join(distAssetsDir, 'index.css'));
    console.log(`  + Created deterministic alias: dist/assets/index.css -> ${mainCss}`);
  }
}

// Create 404.html fallback in dist
fs.copyFileSync(
  path.join(rootDir, 'dist', 'index.html'),
  path.join(rootDir, 'dist', '404.html')
);
console.log('  + Created dist/404.html');

// Copy Images directory to dist/Images
const imagesDir = path.join(rootDir, 'Images');
if (fs.existsSync(imagesDir)) {
  fs.cpSync(imagesDir, path.join(rootDir, 'dist', 'Images'), { recursive: true });
  console.log('  + Mirrored Images/ to dist/Images/');
}

// Step 4: Mirror dist to client-build
console.log('\n[4/6] Mirroring dist/ to client-build/...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(rootDir, 'client-build'), { recursive: true });
console.log('  + Successfully mirrored dist/ to client-build/');

// Step 5: Bundle Node server with esbuild for production
console.log('\n[5/6] Bundling server.ts with esbuild...');
execSync('npx esbuild server.ts --bundle --platform=node --target=node18 --format=cjs --external:vite --minify --outfile=app.js', {
  stdio: 'inherit',
  cwd: rootDir
});
fs.copyFileSync(path.join(rootDir, 'app.js'), path.join(rootDir, 'server.cjs'));
console.log('  + Generated app.js and server.cjs');

// Step 6: Create cPanel deployment zip
console.log('\n[6/6] Packaging cpanel-deploy.zip...');
require('./pack-cpanel.js');

console.log('\n====================================================');
console.log('[Production Build] Build completed successfully.');
console.log('====================================================\n');
