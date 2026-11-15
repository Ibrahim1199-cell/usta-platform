package com.usta.mobile;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.usta.mobile.api.RetrofitClient;
import com.usta.mobile.model.User;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private EditText etPhone, etPassword;
    private Button btnLogin;
    private ProgressBar progressBar;
    private TextView tvGoToRegister;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        etPhone = findViewById(R.id.etLoginPhone);
        etPassword = findViewById(R.id.etLoginPassword);
        btnLogin = findViewById(R.id.btnLogin);
        progressBar = findViewById(R.id.progressLogin);
        tvGoToRegister = findViewById(R.id.tvGoToRegister);

        tvGoToRegister.setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, RegisterActivity.class));
        });

        btnLogin.setOnClickListener(v -> loginUser());
    }

    private void loginUser() {
        String phone = etPhone.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (phone.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Telefon və şifrəni daxil edin", Toast.LENGTH_SHORT).show();
            return;
        }

        progressBar.setVisibility(View.VISIBLE);
        btnLogin.setEnabled(false);

        Map<String, String> credentials = new HashMap<>();
        credentials.put("phone", phone);
        credentials.put("password", password);

        RetrofitClient.getApiService().login(credentials).enqueue(new Callback<User>() {
            @Override
            public void onResponse(Call<User> call, Response<User> response) {
                progressBar.setVisibility(View.GONE);
                btnLogin.setEnabled(true);

                if (response.isSuccessful() && response.body() != null) {
                    User loggedUser = response.body();
                    Toast.makeText(MainActivity.this, "Xoş gəldiniz, " + loggedUser.getFullName(), Toast.LENGTH_SHORT).show();

                    // Roluna görə uyğun ana ekrana yönləndiririk (növbəti addımda yaradacağıq)
                    if ("USTA".equalsIgnoreCase(loggedUser.getRole())) {
                         Intent intent = new Intent(MainActivity.this, MasterHomeActivity.class);
                         intent.putExtra("user", loggedUser);
                         startActivity(intent);
                        Toast.makeText(MainActivity.this, "Usta Paneli hazırdır!", Toast.LENGTH_LONG).show();
                    } else {
                         Intent intent = new Intent(MainActivity.this, CustomerHomeActivity.class);
                         intent.putExtra("user", loggedUser);
                         startActivity(intent);
                        Toast.makeText(MainActivity.this, "Müştəri Paneli hazırdır!", Toast.LENGTH_LONG).show();
                    }
                } else {
                    Toast.makeText(MainActivity.this, "Telefon və ya şifrə yanlışdır!", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<User> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                btnLogin.setEnabled(true);
                Toast.makeText(MainActivity.this, "Server xətası: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}