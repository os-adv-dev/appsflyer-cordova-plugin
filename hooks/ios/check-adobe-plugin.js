const fs = require('fs');
const path = require('path');

module.exports = function (context) {
  const iosPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
  const appName = fs.readdirSync(iosPath).find(f => f.endsWith('.xcodeproj'))?.replace('.xcodeproj', '');
  if (!appName) return;

  const pluginIdToCheck = 'cordova-adobe-plugin';
  const pluginsPath = path.join(iosPath, 'Plugins');
  const adobePath = path.join(pluginsPath, pluginIdToCheck, 'AppDelegate+Adobe.m');
  const appsflyerM = path.join(iosPath, appName, 'AppDelegate+AppsFlyer.m');

  if (fs.existsSync(adobePath)) {
    console.log('✅ ---- Cordova Adobe Plugin is present in the App ----');

    let content = fs.readFileSync(appsflyerM, 'utf8');
    content = content.split('\n').map(line => `// ${line}`).join('\n');
    fs.writeFileSync(appsflyerM, content, 'utf8');

    let adobeContent = fs.readFileSync(adobePath, 'utf8');
    if (!adobeContent.includes('[AppsFlyerLib shared]')) {
      adobeContent = adobeContent.replace(
        /didRegisterForRemoteNotificationsWithDeviceToken:[\s\S]*?\{/,
        match => `${match}\n    [[AppsFlyerLib shared] registerUninstall:deviceToken];`
      );
      fs.writeFileSync(adobePath, adobeContent, 'utf8');
      console.log('✅ Injected AppsFlyer uninstall registration into Adobe delegate.');
    }

  } else {
    console.log('✅ ---- Cordova Adobe Plugin is NOT present in the App----');

    const commentHook = path.join(context.opts.plugin.dir, 'hooks', 'ios', 'comment_objc_class.js');
    require(commentHook)(context);
  }
};