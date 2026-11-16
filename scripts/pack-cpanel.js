const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function makeCpanelZip() {
  const zipFilename = 'cpanel-deploy.zip';

  // Ensure tmp directory and restart.txt exist with current timestamp
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));

  const zip = new AdmZip();

  console.log(`[JavaScript Packager] Creating ${zipFilename} for cPanel deployment...`);

  // 1. Add compiled index.html to zip root (CRITICAL: Overwrites public_html/index.html so Apache serves latest build)
  const compiledIndexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(compiledIndexPath)) {
    zip.addLocalFile(compiledIndexPath, '', 'index.html');
    console.log('  + Added compiled index.html directly to zip root');
  }

  // 2. Add compiled 404.html to zip root
  const compiled404Path = path.join(process.cwd(), 'dist', '404.html');
  if (fs.existsSync(compiled404Path)) {
    zip.addLocalFile(compiled404Path, '', '404.html');
    console.log('  + Added compiled 404.html directly to zip root');
  }

  // 3. Add compiled assets directory to zip root (e.g. /public_html/assets/)
  const compiledAssetsPath = path.join(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(compiledAssetsPath)) {
    zip.addLocalFolder(compiledAssetsPath, 'assets');
    console.log('  + Added compiled assets/ directly to zip root');
  }

  // 4. Standard deployment files and directories
  const includeItems = [
    'app.js',
    'server.cjs',
    'dist',
    'client-build',
    'Images',
    'tmp',
    '.htaccess',
    'db_config.json',
    'package.json',
    'cpanel_users_table.sql',
    'cpanel_quotes_table.sql',
    'cpanel_quote_table.sql',
    'CPANEL_DEPLOYMENT_GUIDE.md'
  ];

  for (const item of includeItems) {
    const itemPath = path.join(process.cwd(), item);
    if (!fs.existsSync(itemPath)) continue;

    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      zip.addLocalFolder(itemPath, item);
      console.log(`  + Added directory: ${item}/`);
    } else {
      zip.addLocalFile(itemPath, '', item);
      console.log(`  + Added file: ${item}`);
    }
  }

  zip.writeZip(zipFilename);
  const sizeMb = (fs.statSync(zipFilename).size / (1024 * 1024)).toFixed(2);
  console.log(`[JavaScript Packager] Successfully generated ${zipFilename} (${sizeMb} MB) with root index.html!`);
}

makeCpanelZip();
