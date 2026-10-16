// macOS: no Apple Developer ID here, so ad-hoc sign the .app before it goes into the DMG.
// Without any signature Apple Silicon refuses to launch it ("app is damaged").
const { execSync } = require('child_process');
const path = require('path');

exports.default = async (ctx) => {
  if (ctx.electronPlatformName !== 'darwin') return;
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
};
