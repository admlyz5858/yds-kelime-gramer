package com.admlyz.ydsders;

import android.graphics.Color;
import android.view.View;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Sistem çubuklarının arkasındaki rengi ve ikon tonunu web temasıyla eşler
// (API 35+ ile setStatusBarColor işlevsiz; renk kök görünümden gelir).
@CapacitorPlugin(name = "Kenar")
public class KenarPlugin extends Plugin {
    @PluginMethod
    public void renk(PluginCall call) {
        String renk = call.getString("renk", "#f1f3f5");
        boolean koyu = Boolean.TRUE.equals(call.getBoolean("koyu", false));
        getActivity().runOnUiThread(() -> {
            try {
                View root = getActivity().findViewById(android.R.id.content);
                root.setBackgroundColor(Color.parseColor(renk));
                WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getActivity().getWindow(), root);
                c.setAppearanceLightStatusBars(!koyu);
                c.setAppearanceLightNavigationBars(!koyu);
                call.resolve();
            } catch (Exception e) {
                call.reject("renk uygulanamadı: " + e.getMessage());
            }
        });
    }
}
