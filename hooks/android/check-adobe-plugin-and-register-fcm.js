const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const pluginIdToCheck = 'cordova-adobe-plugin';

    const installedPlugins = context.opts.plugin ? [context.opts.plugin.id] : context.opts.plugins || [];

    const projectRoot = context.opts.projectRoot;
    const pluginsDir = path.join(projectRoot, 'plugins');

    let pluginInstalled = false;

    // 1. Check if plugin is currently being installed
    if (installedPlugins.includes(pluginIdToCheck)) {
        pluginInstalled = true;
    }

    // 2. Check if plugin is already installed in the "plugins" folder
    if (!pluginInstalled && fs.existsSync(path.join(pluginsDir, pluginIdToCheck))) {
        pluginInstalled = true;
    }

    if (pluginInstalled) {
        console.log(` ✅ [AppsFlyerPlugin] '${pluginIdToCheck}' is installed. Skipping FirebaseMessagingService registration here.`);
        // Here you can mark that the step should be skipped or inject logic into the Adobe plugin later
    } else {
        console.log(` ✅ [AppsFlyerPlugin] '${pluginIdToCheck}' is NOT installed. Proceeding with FirebaseMessagingService registration in AppsFlyer plugin.`);
        // Here you can inject the service registration or let the <config-file> from plugin.xml handle it
    }
};