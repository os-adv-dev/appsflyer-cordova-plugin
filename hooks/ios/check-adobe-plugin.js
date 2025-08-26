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

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const projectName = getProjectName(projectRoot);
  const iosPath = path.join(projectRoot, 'platforms', 'ios');
  const appsflyerM = path.join(iosPath, projectName, 'AppDelegate+AppsFlyer.m');

  const pluginIdToCheck = 'cordova-adobe-plugin';
  const adobePath = path.join(projectRoot, 'plugins', pluginIdToCheck, 'src', 'ios', 'AppDelegate+Adobe.m');

  if (fs.existsSync(adobePath)) {
    console.log('--- ✅ Cordova Adobe Plugin is present. Injecting uninstall logic...');

    // ✅ 1. Comenta AppDelegate+AppsFlyer.m inteiro
    if (fs.existsSync(appsflyerM)) {
      let content = fs.readFileSync(appsflyerM, 'utf8');
      content = content.split('\n').map(line => `// ${line}`).join('\n');
      fs.writeFileSync(appsflyerM, content, 'utf8');
    }

    // ✅ 2. Edita AppDelegate+Adobe.m para injetar chamada do AppsFlyer
    let adobeContent = fs.readFileSync(adobePath, 'utf8');
    if (!adobeContent.includes('[AppsFlyerLib shared]')) {
      adobeContent = adobeContent.replace(
        /didRegisterForRemoteNotificationsWithDeviceToken:[\s\S]*?\{/,
        match => `${match}\n    [[AppsFlyerLib shared] registerUninstall:deviceToken];`
      );
      fs.writeFileSync(adobePath, adobeContent, 'utf8');
      console.log('--- ✅ Injected AppsFlyer uninstall registration into Adobe delegate.');
    }

  } else {
    console.log('--- ❌ Cordova Adobe Plugin is NOT present. Falling back to comment Firebase files.');

    // ✅ Executa hook de fallback (comment_objc_class.js)
    const fallbackHook = path.join(context.opts.plugin.dir, 'hooks', 'ios', 'comment_objc_class.js');
    require(fallbackHook)(context);
  }
};