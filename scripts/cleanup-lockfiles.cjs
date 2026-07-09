const fs = require('node:fs');
const path = require('node:path');

const cwd = process.cwd();
for (const fileName of ['package-lock.json', 'yarn.lock']) {
  const targetPath = path.join(cwd, fileName);
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}
