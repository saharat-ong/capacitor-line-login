package com.rinary.plugins.linelogin;

import android.content.Intent;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.linecorp.linesdk.LineApiResponseCode;
import com.linecorp.linesdk.LineIdToken;
import com.linecorp.linesdk.Scope;
import com.linecorp.linesdk.auth.LineAuthenticationParams;
import com.linecorp.linesdk.auth.LineLoginApi;
import com.linecorp.linesdk.auth.LineLoginResult;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.json.JSONException;

/**
 * Capacitor plugin for LINE Login (app-to-app; SDK falls back to web login).
 * Channel ID from JS at runtime — never embed the channel secret. Never log tokens.
 */
@CapacitorPlugin(name = "LineLogin")
public class LineLoginPlugin extends Plugin {
    private static final String TAG = "LineLogin";
    private static final List<String> DEFAULT_SCOPES =
            Arrays.asList("profile", "openid", "email");

    private String channelId;
    private boolean setupCompleted = false;

    @PluginMethod
    public void setup(PluginCall call) {
        String id = call.getString("channelId");
        if (id == null || id.trim().isEmpty()) {
            call.reject("Missing channelId", "LOGIN_FAILED");
            return;
        }
        channelId = id.trim();
        setupCompleted = true;
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", setupCompleted && channelId != null && !channelId.isEmpty());
        call.resolve(ret);
    }

    @PluginMethod
    public void login(PluginCall call) {
        if (!setupCompleted || channelId == null || channelId.isEmpty()) {
            call.reject("LineLogin.setup() has not been called", "NOT_SETUP");
            return;
        }

        String nonce = call.getString("nonce");
        if (nonce == null || nonce.trim().isEmpty()) {
            call.reject("Missing nonce", "LOGIN_FAILED");
            return;
        }

        List<Scope> scopes = mapScopes(readScopes(call));
        if (scopes.isEmpty()) {
            call.reject("No valid scopes", "LOGIN_FAILED");
            return;
        }

        try {
            LineAuthenticationParams params =
                    new LineAuthenticationParams.Builder()
                            .scopes(scopes)
                            .nonce(nonce.trim())
                            .build();
            Intent loginIntent =
                    LineLoginApi.getLoginIntent(getContext(), channelId, params);
            startActivityForResult(call, loginIntent, "lineLoginResult");
        } catch (Exception e) {
            Log.e(TAG, "failed to start LINE login", e);
            call.reject(
                    e.getMessage() != null ? e.getMessage() : "LINE login failed",
                    "LOGIN_FAILED");
        }
    }

    @ActivityCallback
    private void lineLoginResult(PluginCall call, ActivityResult activityResult) {
        if (call == null) {
            return;
        }

        Intent data = activityResult.getData();
        LineLoginResult result = LineLoginApi.getLoginResultFromIntent(data);
        LineApiResponseCode code = result.getResponseCode();

        if (code == LineApiResponseCode.SUCCESS) {
            // Never log tokens.
            if (result.getLineCredential() == null
                    || result.getLineCredential().getAccessToken() == null) {
                call.reject("LINE login succeeded but access token missing", "LOGIN_FAILED");
                return;
            }
            String accessToken = result.getLineCredential().getAccessToken().getTokenString();
            LineIdToken lineIdToken = result.getLineIdToken();
            String idToken = lineIdToken != null ? lineIdToken.getRawString() : null;
            if (idToken == null || idToken.isEmpty()) {
                call.reject("LINE login succeeded but ID token missing", "LOGIN_FAILED");
                return;
            }
            if (accessToken == null || accessToken.isEmpty()) {
                call.reject("LINE login succeeded but access token missing", "LOGIN_FAILED");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("accessToken", accessToken);
            call.resolve(ret);
            return;
        }

        if (code == LineApiResponseCode.CANCEL) {
            call.reject("LINE login cancelled", "CANCELLED");
            return;
        }

        String message =
                result.getErrorData() != null
                        ? result.getErrorData().toString()
                        : "LINE login failed";
        Log.e(TAG, "login failed: " + code);
        call.reject(message, "LOGIN_FAILED");
    }

    private static List<String> readScopes(PluginCall call) {
        JSArray arr = call.getArray("scopes");
        if (arr == null || arr.length() == 0) {
            return DEFAULT_SCOPES;
        }
        List<String> names = new ArrayList<>();
        try {
            for (int i = 0; i < arr.length(); i++) {
                Object v = arr.get(i);
                if (v != null) {
                    names.add(String.valueOf(v));
                }
            }
        } catch (JSONException e) {
            return DEFAULT_SCOPES;
        }
        return names.isEmpty() ? DEFAULT_SCOPES : names;
    }

    private static List<Scope> mapScopes(List<String> names) {
        List<Scope> out = new ArrayList<>();
        for (String raw : names) {
            if (raw == null) {
                continue;
            }
            switch (raw.toLowerCase()) {
                case "profile":
                    out.add(Scope.PROFILE);
                    break;
                case "openid":
                    out.add(Scope.OPENID_CONNECT);
                    break;
                case "email":
                    out.add(Scope.OC_EMAIL);
                    break;
                default:
                    break;
            }
        }
        return out;
    }
}
