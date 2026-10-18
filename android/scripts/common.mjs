// Gedeelde paden en omgeving voor de Android-scripts.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ANDROID = path.join(HERE, '..');
export const ROOT = path.join(ANDROID, '..');
export const WWW = path.join(ANDROID, 'www');
export const PROJECT = path.join(ANDROID, 'android');
export const OUT = path.join(ANDROID, 'out');
export const WEB_DIST = path.join(ROOT, 'web-dist');
export const IS_WIN = process.platform === 'win32';

export const mb = (n) => (n / 1e6).toFixed(1) + ' MB';

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
export const sizeOf = (files) => files.reduce((a, f) => a + fs.statSync(f).size, 0);

// De SDK staat bewust buiten de repo (ANDROID_HOME of ~/android-sdk).
export function sdkRoot() {
  const c = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(os.homedir(), 'android-sdk')].filter(Boolean);
  return c.find((p) => fs.existsSync(path.join(p, 'platform-tools'))) || null;
}

export function javaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', IS_WIN ? 'java.exe' : 'java'))) return process.env.JAVA_HOME;
  const dirs = IS_WIN ? ['C:/Program Files/Java', 'C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Microsoft'] : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    const j = fs.readdirSync(d).filter((n) => /(jdk|java).*(2[1-9])/i.test(n)).sort().pop();
    if (j) return path.join(d, j);
  }
  return null;
}

export function toolEnv() {
  const sdk = sdkRoot();
  const jdk = javaHome();
  const env = { ...process.env };
  if (sdk) { env.ANDROID_HOME = sdk; env.ANDROID_SDK_ROOT = sdk; }
  if (jdk) { env.JAVA_HOME = jdk; env.PATH = path.join(jdk, 'bin') + path.delimiter + env.PATH; }
  return { env, sdk, jdk };
}
