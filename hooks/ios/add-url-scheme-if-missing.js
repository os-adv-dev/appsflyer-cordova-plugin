// File: hooks/ios/add-url-scheme-if-missing.js
const fs = require('fs');
const path = require('path');
const plist = require('plist');

module.exports = function (context) {
  const { projectRoot } = context.opts;

  const IOS_SCHEME = process.env.IOS_SCHEME_ONE_LINK || 'onelink';
  const IOS_URL_SCHEME = process.env.IOS_URL_SCHEME || 'mycustomscheme';

  const appName = fs.readdirSync(path.join(projectRoot, 'platforms', 'ios'))
    .find(file => file.endsWith('.xcodeproj'))
    ?.replace('.xcodeproj', '');

  if (!appName) {
    console.warn('[Hook] ❌ iOS app name not found');
    return;
  }

  const plistPath = path.join(projectRoot, 'platforms', 'ios', appName, `${appName}-Info.plist`);

  if (!fs.existsSync(plistPath)) {
    console.warn('[Hook] ❌ Info.plist not found at:', plistPath);
    return;
  }

  const plistContent = fs.readFileSync(plistPath, 'utf8');
  const plistData = plist.parse(plistContent);

  plistData.CFBundleURLTypes = plistData.CFBundleURLTypes || [];

  const alreadyExists = plistData.CFBundleURLTypes.some(entry => {
    const schemes = entry.CFBundleURLSchemes || [];
    return schemes.includes(IOS_URL_SCHEME);
  });

  if (alreadyExists) {
    console.log(`[Hook] ✅ URL scheme '${IOS_URL_SCHEME}' already exists in Info.plist`);
    return;
  }

  plistData.CFBundleURLTypes.push({
    CFBundleURLName: IOS_SCHEME,
    CFBundleURLSchemes: [IOS_URL_SCHEME]
  });

  fs.writeFileSync(plistPath, plist.build(plistData), 'utf8');
  console.log(`[Hook] ✅ Added URL scheme '${IOS_URL_SCHEME}' with name '${IOS_SCHEME}' to Info.plist`);
};