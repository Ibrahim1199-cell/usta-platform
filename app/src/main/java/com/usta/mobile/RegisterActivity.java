package com.usta.mobile;

import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioGroup;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.usta.mobile.api.RetrofitClient;
import com.usta.mobile.model.User;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private RadioGroup rgRole;
    private LinearLayout layoutMasterFields;
    private EditText etFullName, etPhone, etPassword, etCity, etExperience, etAbout;
    private Spinner spinnerCategory;
    private Button btnRegister;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        rgRole = findViewById(R.id.rgRole);
        layoutMasterFields = findViewById(R.id.layoutMasterFields);
        etFullName = findViewById(R.id.etRegFullName);
        etPhone = findViewById(R.id.etRegPhone);
        etPassword = findViewById(R.id.etRegPassword);
        etCity = findViewById(R.id.etRegCity);
        spinnerCategory = findViewById(R.id.spinnerCategory);
        etExperience = findViewById(R.id.etRegExperience);
        etAbout = findViewById(R.id.etRegAbout);
        btnRegister = findViewById(R.id.btnRegister);
        progressBar = findViewById(R.id.progressRegister);

        // Usta ixtisas kateqoriyaları
        String[] categories = {"Santexnik", "Elektrik", "Mebel ustası", "Kombi/Kondisioner", "Təmir-tikinti", "Avto usta"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, categories);
        spinnerCategory.setAdapter(adapter);

        // Usta seçiləndə əlavə xanaları aç, Müştəri seçiləndə gizlət
        rgRole.setOnCheckedChangeListener((group, checkedId) -> {
            if (checkedId == R.id.rbMaster) {
                layoutMasterFields.setVisibility(View.VISIBLE);
            } else {
                layoutMasterFields.setVisibility(View.GONE);
            }
        });

        btnRegister.setOnClickListener(v -> registerUser());
    }

    private void registerUser() {
        String fullName = etFullName.getText().toString().trim();
        String phone = etPhone.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String city = etCity.getText().toString().trim();

        if (fullName.isEmpty() || phone.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Ad, telefon və şifrə mütləqdir!", Toast.LENGTH_SHORT).show();
            return;
        }

        boolean isMaster = (rgRole.getCheckedRadioButtonId() == R.id.rbMaster);

        User user = new User();
        user.setFullName(fullName);
        user.setPhone(phone);
        user.setPassword(password);
        user.setCity(city.isEmpty() ? "Bakı" : city);
        user.setRole(isMaster ? "USTA" : "MUSTERI");

        if (isMaster) {
            user.setCategory(spinnerCategory.getSelectedItem().toString());
            user.setExperience(etExperience.getText().toString().trim());
            user.setAbout(etAbout.getText().toString().trim());
        }

        progressBar.setVisibility(View.VISIBLE);
        btnRegister.setEnabled(false);

        RetrofitClient.getApiService().register(user).enqueue(new Callback<User>() {
            @Override
            public void onResponse(Call<User> call, Response<User> response) {
                progressBar.setVisibility(View.GONE);
                btnRegister.setEnabled(true);

                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(RegisterActivity.this, "Qeydiyyat uğurludur! İndi daxil olun.", Toast.LENGTH_LONG).show();
                    finish(); // Giriş ekranına qayıdır
                } else {
                    Toast.makeText(RegisterActivity.this, "Qeydiyyat xətası! Bu nömrə artıq mövcud ola bilər.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<User> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                btnRegister.setEnabled(true);
                Toast.makeText(RegisterActivity.this, "Bağlantı xətası: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}