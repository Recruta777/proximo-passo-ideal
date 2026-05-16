const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const root = path.join(__dirname, '..');

const dirs = ['css', 'js', 'img'];
const files = ['index.html', 'admin.html'];

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true });
}
fs.mkdirSync(dist);

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

for (const dir of dirs) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(dist, dir), { recursive: true });
  }
}

console.log('Build concluido: dist/');
