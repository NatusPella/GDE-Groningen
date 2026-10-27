// Bouwt de debug-APK: stage (tenzij --no-stage), dan `gradlew assembleDebug`.
// De APK wordt alleen met de lokale debug-keystore van Gradle ondertekend
// (~/.android/debug.keystore); geen eigen sleutels, geen upload.
//
//   node scripts/build.mjs [--rebuild] [--no-stage]   -> android/out/gde-groningen-debug.apk
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { ANDROID, PROJECT, OUT, IS_WIN, mb, toolEnv } from './common.mjs';

const args = process.argv.slice(2);
const { env, sdk, jdk } = toolEnv();
if (!sdk) throw new Error('Geen Android-SDK gevonden: zet ANDROID_HOME of installeer in ~/android-sdk (docs/ANDROID.md)');
if (!jdk) throw new Error('Geen JDK 21 gevonden: zet JAVA_HOME (docs/ANDROID.md)');

if (!args.includes('--no-stage')) {
  execFileSync(process.execPath, [path.join(ANDROID, 'scripts', 'stage.mjs'), ...args.filter((a) => a === '--rebuild')], { stdio: 'inherit', env });
} else {
  // zonder stage moet de versie alsnog kloppen (#483)
  execFileSync(process.execPath, [path.join(ANDROID, 'scripts', 'version.mjs')], { stdio: 'inherit' });
}
// local.properties staat in .gitignore (pad naar de SDK, per machine)
fs.writeFileSync(path.join(PROJECT, 'local.properties'), 'sdk.dir=' + sdk.split('\\').join('/') + '\n');

const gradlew = path.join(PROJECT, IS_WIN ? 'gradlew.bat' : 'gradlew');
execFileSync(gradlew, ['assembleDebug', '--console=plain'], { cwd: PROJECT, env, stdio: 'inherit', shell: IS_WIN });

const apk = path.join(PROJECT, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
fs.mkdirSync(OUT, { recursive: true });
const dst = path.join(OUT, 'gde-groningen-debug.apk');
fs.copyFileSync(apk, dst);
console.log(`APK: ${path.relative(path.join(ANDROID, '..'), dst)} (${mb(fs.statSync(dst).size)})`);
