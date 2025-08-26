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
  const uninstallLine = '[[AppsFlyerLib shared] registerUninstall:deviceToken];';

  let adobeContent = fs.readFileSync(adobePath, 'utf8');

  if (adobeContent.includes(uninstallLine)) {
    console.log('ℹ️ AppsFlyer uninstall line already present in Adobe delegate.');
    return;
  }

  const methodRegex = /- \(void\)application:\(UIApplication \*\)application didRegisterForRemoteNotificationsWithDeviceToken:\(NSData \*\)deviceToken \{([\s\S]*?)\n\}/;

  const match = adobeContent.match(methodRegex);
  if (match) {
    const methodBody = match[1];
    const newBody = methodBody + `\n    ${uninstallLine}`;
    adobeContent = adobeContent.replace(methodBody, newBody);
    fs.writeFileSync(adobePath, adobeContent, 'utf8');
    console.log('✅ Injected AppsFlyer uninstall registration into Adobe delegate.');
  } else {
    console.warn('⚠️ Could not find the method didRegisterForRemoteNotificationsWithDeviceToken in Adobe delegate.');
  }
}

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const projectName = getProjectName(projectRoot);
  const iosPath = path.join(projectRoot, 'platforms', 'ios');
  const appsflyerM = path.join(iosPath, projectName, 'AppDelegate+AppsFlyer.m');
  const appsflyerH = path.join(iosPath, projectName, 'AppDelegate+AppsFlyer.h');

  const pluginIdToCheck = 'cordova-adobe-plugin';
  const adobePath = path.join(projectRoot, 'plugins', pluginIdToCheck, 'src', 'ios', 'AppDelegate+Adobe.m');

  if (fs.existsSync(adobePath)) {
    console.log('✅ Cordova Adobe Plugin is present. Proceeding...');

    // ✅ 1. Comment both .m and .h files of AppsFlyer
    commentAppsFlyerFiles(appsflyerM, appsflyerH);

    // ✅ 2. Inject uninstall tracking in AppDelegate+Adobe.m
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