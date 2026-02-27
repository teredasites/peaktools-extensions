import JSZip from 'jszip';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';

function addDirToZip(zip, dirPath, zipPath = '') {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const entryZipPath = zipPath ? `${zipPath}/${entry}` : entry;
    if (statSync(fullPath).isDirectory()) {
      addDirToZip(zip, fullPath, entryZipPath);
    } else {
      zip.file(entryZipPath, readFileSync(fullPath));
    }
  }
}

const zip = new JSZip();

// Add manifest
zip.file('manifest.json', readFileSync('manifest.json'));

// Add dist
addDirToZip(zip, 'dist', 'dist');

// Add HTML/CSS from src
const uiDirs = ['popup', 'sidepanel', 'offscreen'];
for (const dir of uiDirs) {
  const srcDir = path.join('src', dir);
  if (!existsSync(srcDir)) continue;
  for (const file of readdirSync(srcDir)) {
    if (file.endsWith('.html') || file.endsWith('.css')) {
      zip.file(`src/${dir}/${file}`, readFileSync(path.join(srcDir, file)));
    }
  }
}

// Add locales (must be at root _locales/ for Chrome)
const localesDir = path.join('src', '_locales');
if (existsSync(localesDir)) {
  addDirToZip(zip, localesDir, '_locales');
}

// Add icons
if (existsSync('assets')) {
  addDirToZip(zip, 'assets', 'assets');
}

const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const filename = `copyunlock-v${pkg.version}.zip`;
writeFileSync(filename, buffer);
console.log(`[package] created ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
