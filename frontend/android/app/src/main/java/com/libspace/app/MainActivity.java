package com.libspace.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_REQUEST_CODE = 200;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Proactively request camera permissions on launch for seamless QR scanning & photo upload
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.CAMERA},
                CAMERA_REQUEST_CODE
            );
        }

        // Enable popup windows and multi-window for Razorpay NetBanking and bank auth flows
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings webSettings = getBridge().getWebView().getSettings();
            webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
            webSettings.setSupportMultipleWindows(true);
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
        }
    }
}
