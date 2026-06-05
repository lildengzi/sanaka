const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const plistPath = path.join(context.appOutDir, 'Sanaka.app', 'Contents', 'Info.plist');

  const setPlistValue = (key, type, value) => {
    try {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plistPath]);
    } catch {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} ${type} ${value}`, plistPath]);
    }
  };

  setPlistValue('CFBundleShortVersionString', 'string', '0.0.1 (beta)');
  setPlistValue('CFBundleVersion', 'string', '0.0.1');
  setPlistValue('NSHumanReadableCopyright', 'string', 'Copyright © 2026 Sanakaprix');
}
