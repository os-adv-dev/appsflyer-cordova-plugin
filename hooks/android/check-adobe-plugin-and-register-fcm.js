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
        console.log('✅ [AppsFlyerPlugin] cordova-adobe-plugin is installed — modifying AdobeMobileFirebaseMessaging.java');

        const adobeMessagingPath = path.join(
            projectRoot,
            'platforms/android/app/src/main/java/com/adobe/marketing/mobile/cordova/AdobeMobileFirebaseMessaging.java'
        );

        if (!fs.existsSync(adobeMessagingPath)) {
            console.warn('✅ [AppsFlyerPlugin] AdobeMobileFirebaseMessaging.java not found at: ' + adobeMessagingPath);
            return;
        }

        let content = fs.readFileSync(adobeMessagingPath, 'utf-8');

        // ✅ Add AppsFlyerLib import
        if (!content.includes('com.appsflyer.AppsFlyerLib')) {
            content = content.replace(/(import[^\n]+;)(?![\s\S]*import com\.appsflyer\.AppsFlyerLib)/, `$1\nimport com.appsflyer.AppsFlyerLib;`);
        }

        // ✅ Add updateServerUninstallToken on onNewToken()
        if (!content.includes('updateServerUninstallToken')) {
            content = content.replace(
                /public void onNewToken\(@NonNull String token\) \{([\s\S]*?)\n\s*\}/,
                (match, inner) => {
                    return `public void onNewToken(@NonNull String token) {${inner}\n        AppsFlyerLib.getInstance().updateServerUninstallToken(getApplicationContext(), token);\n    }`;
                }
            );
        }

        // ✅ Add validation tracking no onMessageReceived
        if (!content.includes('af-uinstall-tracking')) {
            content = content.replace(
                /public void onMessageReceived\(@NonNull RemoteMessage remoteMessage\) \{([\s\S]*?)\n\s*\}/,
                (match, inner) => {
                    const uninstallCheck = `
        if (remoteMessage.getData().containsKey("af-uinstall-tracking") ||
            remoteMessage.getData().containsKey("af-uninstall-tracking")) {
            Log.v(TAG, "onMessageReceived: af-uinstall-tracking");
            return;
        }\n`;
                    return `public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {${uninstallCheck}${inner}\n    }`;
                }
            );
        }

        fs.writeFileSync(adobeMessagingPath, content, 'utf-8');
        console.log('✅ [AppsFlyerPlugin] AdobeMobileFirebaseMessaging.java successfully patched.');
        return;
    }

    console.log('✅ [AppsFlyerPlugin] cordova-adobe-plugin NOT found — injecting FirebaseMessagingService into manifest.');

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