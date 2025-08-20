const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

module.exports = async function (context) {
    const pluginIdToCheck = 'cordova-adobe-plugin';
    const projectRoot = context.opts.projectRoot;
    const pluginsDir = path.join(projectRoot, 'plugins');
    const manifestPath = path.join(projectRoot, 'platforms/android/app/src/main/AndroidManifest.xml');

    const adobeInstalled = fs.existsSync(path.join(pluginsDir, pluginIdToCheck));

    if (adobeInstalled) {
        console.log('✅ [AppsFlyerPlugin] cordova-adobe-plugin is installed — skipping FirebaseMessagingService registration.');
        return;
    }

    console.log('✅ [AppsFlyerPlugin] cordova-adobe-plugin NOT found — injecting FirebaseMessagingService.');

    if (!fs.existsSync(manifestPath)) {
        console.warn('✅ [AppsFlyerPlugin] AndroidManifest.xml not found at: ' + manifestPath);
        return;
    }

    const manifestXml = fs.readFileSync(manifestPath, 'utf-8');

    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ xmldec: { version: '1.0', encoding: 'utf-8' } });

    const manifestObj = await parser.parseStringPromise(manifestXml);

    const appNode = manifestObj.manifest.application?.[0];
    if (!appNode) {
        console.warn('✅ [AppsFlyerPlugin] <application> node not found in AndroidManifest.xml');
        return;
    }

    const services = appNode.service || [];
    const serviceExists = services.some(s => s.$?.['android:name'] === 'com.appsflyer.cordova.plugin.AppsFlyerFirebaseMessagingService');

    if (serviceExists) {
        console.log('✅ [AppsFlyerPlugin] FirebaseMessagingService already exists. Skipping insertion.');
        return;
    }

    const newService = {
        $: {
            'android:name': 'com.appsflyer.cordova.plugin.AppsFlyerFirebaseMessagingService',
            'android:exported': 'false'
        },
        'intent-filter': [{
            action: [{
                $: {
                    'android:name': 'com.google.firebase.MESSAGING_EVENT'
                }
            }]
        }]
    };

    appNode.service = [...services, newService];

    const updatedManifest = builder.buildObject(manifestObj);
    fs.writeFileSync(manifestPath, updatedManifest, 'utf-8');

    console.log('✅ [AppsFlyerPlugin] FirebaseMessagingService successfully injected into AndroidManifest.xml');
};