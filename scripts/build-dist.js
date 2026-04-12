const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const rootFiles = ['index.html', 'xianxia.html', 'styles.css', 'xianxia.css', 'app.js'];
const assetDirs = ['data', 'image'];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of rootFiles) {
  fs.copyFileSync(path.join(repoRoot, file), path.join(distDir, file));
}

for (const dir of assetDirs) {
  const source = path.join(repoRoot, dir);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(distDir, dir), { recursive: true });
}

console.log('rebuilt dist');
