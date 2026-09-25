// No Apple Developer ID: give the macOS app an ad-hoc signature so Apple
// Silicon will run it at all (unsigned arm64 binaries are killed on launch).
// Playtesters still have to allow it once under Privacy & Security.
const { execFileSync } = require('child_process');
const path = require('path');

// runs as afterPack: signing is skipped (no identity), so sign here
exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  // universal builds pack x64 and arm64 halves first; only sign the merged app
  if (/-temp$/.test(context.appOutDir)) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`  ad-hoc signed ${app}`);
};
