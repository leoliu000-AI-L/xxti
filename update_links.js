const fs = require('fs');
const path = require('path');
const dir = 'generated';
const files = fs.readdirSync(dir).filter(f => f.startsWith('xxti_avatar_tasks_') && f.endsWith('.json'));
const avatars = {};

// Sort by modified time descending
files.sort((a, b) => fs.statSync(path.join(dir, b)).mtime - fs.statSync(path.join(dir, a)).mtime);

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  data.forEach(task => {
    if (task.status === 'completed' && task.task_result) {
      let url = '';
      if (task.task_result.image_url) {
        url = task.task_result.image_url;
      } else if (task.task_result.output && task.task_result.output.images && task.task_result.output.images[0]) {
        url = task.task_result.output.images[0].url;
      }
      
      if (url && !avatars[task.code]) {
        avatars[task.code] = url;
      }
    }
  });
});

let jsContent = 'window.XXTI_AVATAR_LINKS = Object.freeze({\n';
const codes = Object.keys(avatars).sort();
codes.forEach((code, i) => {
  jsContent += `  ${code}: "${avatars[code]}"`;
  if (i < codes.length - 1) jsContent += ',\n';
  else jsContent += '\n';
});
jsContent += '});\n';

fs.writeFileSync('data/xxti-avatar-links.js', jsContent);
console.log('Updated data/xxti-avatar-links.js with ' + codes.length + ' new avatars.');
