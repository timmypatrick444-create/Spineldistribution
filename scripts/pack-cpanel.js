import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

function makeCpanelZip() {
  const zipFilename = 'cpanel-deploy.zip';

  // Ensure tmp directory and restart.txt exist with current timestamp
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));

  // Ensure no stale zip files exist inside subdirectories before packing
  ['dist', 'client-build', 'public', 'assets'].forEach(dir => {
    const p = path.join(process.cwd(), dir, zipFilename);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch {}
    }
  });

  const zip = new AdmZip();

  const includeItems = [
    'app.js',
    'server.cjs',
    'dist',
    'client-build',
    'assets',
    'Images',
    'tmp',
    '.htaccess',
    'db_config.json',
    'package.json',
    'build-version.json',
    'cpanel_users_table.sql',
    'cpanel_quotes_table.sql',
    'CPANEL_DEPLOYMENT_GUIDE.md'
  ];

  console.log(`[JavaScript Packager] Creating ${zipFilename} for cPanel deployment...`);

  // Add compiled production dist/index.html as the root index.html inside the zip!
  // This guarantees that extracting cpanel-deploy.zip in public_html immediately replaces any stale root index.html
  const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distIndexPath)) {
    zip.addLocalFile(distIndexPath, '', 'index.html');
    console.log(`  + Added compiled production file: index.html (from dist/index.html)`);
  }

  for (const item of includeItems) {
    const itemPath = path.join(process.cwd(), item);
    if (!fs.existsSync(itemPath)) continue;

    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      zip.addLocalFolder(itemPath, item, (filename) => !filename.endsWith('.zip'));
      console.log(`  + Added directory: ${item}/`);
    } else {
      if (!item.endsWith('.zip')) {
        zip.addLocalFile(itemPath, '', item);
        console.log(`  + Added file: ${item}`);
      }
    }
  }

  zip.writeZip(zipFilename);
  const sizeMb = (fs.statSync(zipFilename).size / (1024 * 1024)).toFixed(2);
  console.log(`[JavaScript Packager] Successfully generated ${zipFilename} (${sizeMb} MB) using pure Node.js!`);

  // Copy cpanel-deploy.zip to public/ so it can be downloaded directly from any URL
  const publicZipPath = path.join(process.cwd(), 'public', zipFilename);
  try {
    fs.copyFileSync(zipFilename, publicZipPath);
    console.log(`  + Synced zip to public/${zipFilename}`);
  } catch {}
}

makeCpanelZip();
