import { spawnSync } from 'node:child_process';
// npm puede normalizar una referencia GitHub HTTPS a SSH en el lockfile.
// La conversión se limita a este proceso; no altera la configuración de Git.
const env = { ...process.env };
const index = Number(env.GIT_CONFIG_COUNT || 0);
env.GIT_CONFIG_COUNT = String(index + 1);
env[`GIT_CONFIG_KEY_${index}`] = 'url.https://github.com/.insteadOf';
env[`GIT_CONFIG_VALUE_${index}`] = 'ssh://git@github.com/';
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], { env, stdio: 'inherit', shell: process.platform === 'win32' });
process.exitCode = result.status ?? 1;
