const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function getProjectName(projectRoot) {
  const configPath = path.join(projectRoot, 'config.xml');
  const config = fs.readFileSync(configPath, 'utf-8');
  let name = null;

  xml2js.parseString(config, (err, result) => {
    if (!err) {
      name = result.widget.name[0].trim();
    }
  });

  return name;
}

function commentAppsFlyerFiles(appsFlyerPathM, appsFlyerPathH) {
  [appsFlyerPathM, appsFlyerPathH].forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const commented = data.split('\n').map(line => `// ${line}`).join('\n');
      fs.writeFileSync(filePath, commented, 'utf8');
      console.log(`✅ Commented file: ${path.basename(filePath)}`);
    } else {
      console.warn(`⚠️ File not found: ${filePath}`);
    }
  });
}

function injectAppsFlyerUninstall(adobePath) {
  let content = fs.readFileSync(adobePath, 'utf8');
  let modified = false;

  const uninstallLine = '[[AppsFlyerLib shared] registerUninstall:deviceToken];';
  const pushIdLine = '[AEPMobileCore setPushIdentifier: deviceToken];';

  // ✅ Step 1: Inject #import if missing
  const importLine = '#import <AppsFlyerLib/AppsFlyerLib.h>';
  if (!content.includes(importLine)) {
    content = importLine + '\n' + content;
    modified = true;
    console.log('✅ Injected AppsFlyer #import');
  }

  // ✅ Step 2: Inject uninstall line after pushIdentifier
  if (!content.includes(uninstallLine) && content.includes(pushIdLine)) {
    content = content.replace(
      pushIdLine,
      `${pushIdLine}\n    ${uninstallLine}`
    );
    modified = true;
    console.log('✅ Injected AppsFlyer registerUninstall line');
  } else if (content.includes(uninstallLine)) {
    console.log('ℹ️ AppsFlyer uninstall line already present.');
  } else {
    console.warn('⚠️ Could not find [AEPMobileCore setPushIdentifier: deviceToken]; to inject after.');
  }

  if (modified) {
    fs.writeFileSync(adobePath, content, 'utf8');
    console.log('✅ Adobe file updated successfully.');
  }
}

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const projectName = getProjectName(projectRoot);
  const iosPath = path.join(projectRoot, 'platforms', 'ios');
  const appsflyerM = path.join(
    iosPath,
    projectName,
    'Plugins',
    'cordova-plugin-appsflyer-sdk',
    'AppDelegate+AppsFlyer.m'
  );

  const appsflyerH = path.join(
    iosPath,
    projectName,
    'Plugins',
    'cordova-plugin-appsflyer-sdk',
    'AppDelegate+AppsFlyer.h'
  );

  const adobePath = path.join(
    iosPath,
    projectName,
    'Plugins',
    'cordova-adobe-plugin',
    'AppDelegate+Adobe.m'
  );

  if (fs.existsSync(adobePath)) {
    console.log('✅ Cordova Adobe Plugin is present. Proceeding...');
    commentAppsFlyerFiles(appsflyerM, appsflyerH);
    injectAppsFlyerUninstall(adobePath);
  } else {
    console.log('❌ Cordova Adobe Plugin is NOT present. Running fallback hook.');
    const fallbackHook = path.join(context.opts.plugin.dir, 'hooks', 'ios', 'comment_objc_class.js');
    if (fs.existsSync(fallbackHook)) {
      require(fallbackHook)(context);
    } else {
      console.warn('⚠️ Fallback hook not found at', fallbackHook);
    }
  }
};