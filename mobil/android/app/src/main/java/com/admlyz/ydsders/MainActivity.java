package com.admlyz.ydsders;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KenarPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 15+ kenardan-kenara zorunluluğu: WebView sistem çubuklarının altına girmesin.
        // Sistem çubuğu + çentik + klavye boşlukları kök görünüme padding olarak uygulanır;
        // çubukların arkasında kök görünümün rengi görünür (KenarPlugin temaya göre ayarlar).
        View root = findViewById(android.R.id.content);
        root.setBackgroundColor(Color.parseColor("#f1f3f5"));
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime());
            v.setPadding(b.left, b.top, b.right, b.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
