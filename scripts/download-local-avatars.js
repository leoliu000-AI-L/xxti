const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const avatarLinksPath = path.join(repoRoot, 'data', 'xxti-avatar-links.js');
const imageDir = path.join(repoRoot, 'image');

function loadAvatarLinks() {
  const code = fs.readFileSync(avatarLinksPath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window.XXTI_AVATAR_LINKS || {};
}

function getExtension(url) {
  const pathname = new URL(url).pathname;
  return path.extname(pathname).toLowerCase() || '.png';
}

function escapeSingleQuotes(value) {
  return value.replace(/'/g, "''");
}

function downloadAvatar(code, url) {
  const ext = getExtension(url);
  const fileName = `${code}${ext}`;
  const filePath = path.join(imageDir, fileName);
  const command = `Invoke-WebRequest -UseBasicParsing '${escapeSingleQuotes(url)}' -OutFile '${escapeSingleQuotes(filePath)}'`;

  execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
    stdio: 'inherit',
  });

  return `./image/${fileName}`;
}

function writeLocalLinks(entries) {
  const lines = ['window.XXTI_AVATAR_LINKS = Object.freeze({'];
  const codes = Object.keys(entries).sort();

  codes.forEach((code, index) => {
    const suffix = index === codes.length - 1 ? '' : ',';
    lines.push(`  ${code}: \"${entries[code]}\"${suffix}`);
  });

  lines.push('});', '');
  fs.writeFileSync(avatarLinksPath, lines.join('\n'), 'utf8');
}

function main() {
  const avatarLinks = loadAvatarLinks();
  fs.mkdirSync(imageDir, { recursive: true });

  const localLinks = {};
  for (const [code, url] of Object.entries(avatarLinks)) {
    if (!/^https?:/i.test(url)) {
      localLinks[code] = url;
      continue;
    }

    localLinks[code] = downloadAvatar(code, url);
    console.log(`downloaded ${code}`);
  }

  writeLocalLinks(localLinks);
  console.log(`localized ${Object.keys(localLinks).length} avatars`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
