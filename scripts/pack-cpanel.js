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
    'cpanel_quote_table.sql',
    'CPANEL_DEPLOYMENT_GUIDE.md'
  ];

  console.log(`[JavaScript Packager] Creating ${zipFilename} for cPanel deployment...`);

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
  console.log(`[JavaScript Packager] Successfully generated ${zipFilename} (${sizeMb} MB) using pure Node.js!`);
}

makeCpanelZip();
