package com.libspace.app;

import android.Manifest;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.ViewGroup;
import android.webkit.GeolocationPermissions;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST_CODE = 200;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Proactively request camera and location permissions on launch for seamless QR scanning & GPS distance
        List<String> permissionsNeeded = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsNeeded.toArray(new String[0]),
                PERMISSIONS_REQUEST_CODE
            );
        }

        // Enable popup windows, geolocation, and multi-window for Razorpay NetBanking and bank auth flows
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView mainWebView = getBridge().getWebView();
            WebSettings webSettings = mainWebView.getSettings();
            webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
            webSettings.setSupportMultipleWindows(true);
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setGeolocationEnabled(true);
            webSettings.setGeolocationDatabasePath(getFilesDir().getPath());

            mainWebView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    callback.invoke(origin, true, false);
                }

                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    WebView popupWebView = new WebView(MainActivity.this);
                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setDatabaseEnabled(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setGeolocationEnabled(true);

                    Dialog popupDialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_NoActionBar_Fullscreen);
                    popupDialog.setContentView(popupWebView, new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    popupWebView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                        @Override
                        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                            callback.invoke(origin, true, false);
                        }

                        @Override
                        public void onCloseWindow(WebView window) {
                            if (popupDialog.isShowing()) {
                                popupDialog.dismiss();
                            }
                        }
                    });

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, String url) {
                            return handleUrl(view, url);
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            if (request != null && request.getUrl() != null) {
                                return handleUrl(view, request.getUrl().toString());
                            }
                            return super.shouldOverrideUrlLoading(view, request);
                        }

                        private boolean handleUrl(WebView view, String url) {
                            if (url == null) return false;
                            if (url.startsWith("http://") || url.startsWith("https://")) {
                                view.loadUrl(url);
                                return true;
                            } else {
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                    startActivity(intent);
                                    return true;
                                } catch (Exception ignored) {
                                    return false;
                                }
                            }
                        }
                    });

                    popupDialog.setOnDismissListener(d -> popupWebView.destroy());
                    popupDialog.show();

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
        }
    }
}
