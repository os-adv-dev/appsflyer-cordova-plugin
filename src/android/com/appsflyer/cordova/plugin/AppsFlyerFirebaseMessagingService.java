package com.appsflyer.cordova.plugin;


import android.util.Log;

import androidx.annotation.NonNull;

import com.appsflyer.AppsFlyerLib;
import com.google.firebase.messaging.RemoteMessage;
import com.outsystems.plugins.firebasemessaging.controller.FirebaseMessagingReceiveService;

/**
 * This AppsFlyerFirebaseMessagingService receive all the notification information FCM
 */
public class AppsFlyerFirebaseMessagingService extends FirebaseMessagingReceiveService {

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        AppsFlyerLib.getInstance().updateServerUninstallToken(getApplicationContext(), token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        if(remoteMessage.getData().containsKey("af-uinstall-tracking") || remoteMessage.getData().containsKey("af-uninstall-tracking")){ // "uinstall" is not a typo
            Log.v(AppsFlyerFirebaseMessagingService.class.getSimpleName(), "onMessageReceived: af-uinstall-tracking");
            return; // "uinstall" is not a typo
        } else {
            super.onMessageReceived(remoteMessage);
        }
    }
}