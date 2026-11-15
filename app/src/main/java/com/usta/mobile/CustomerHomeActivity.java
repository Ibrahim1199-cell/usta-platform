package com.usta.mobile;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

import com.usta.mobile.api.RetrofitClient;
import com.usta.mobile.model.Order;
import com.usta.mobile.model.User;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CustomerHomeActivity extends AppCompatActivity {

    private User currentUser;
    private TextView tvWelcome;
    private Button btnLogout, btnTabMasters, btnTabMyOrders;
    private Spinner spinnerCategory;
    private ProgressBar progressBar;
    private LinearLayout containerList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_customer_home);

        currentUser = (User) getIntent().getSerializableExtra("user");

        tvWelcome = findViewById(R.id.tvCustomerWelcome);
        btnLogout = findViewById(R.id.btnCustomerLogout);
        btnTabMasters = findViewById(R.id.btnTabMasters);
        btnTabMyOrders = findViewById(R.id.btnTabMyOrders);
        spinnerCategory = findViewById(R.id.spinnerFilterCategory);
        progressBar = findViewById(R.id.progressCustomer);
        containerList = findViewById(R.id.containerCustomerList);

        if (currentUser != null) {
            tvWelcome.setText("Salam, " + currentUser.getFullName());
        }

        btnLogout.setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        });

        String[] categories = {"Hamısı", "Santexnik", "Elektrik", "Mebel ustası", "Kombi/Kondisioner", "Təmir-tikinti", "Avto usta"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, categories);
        spinnerCategory.setAdapter(adapter);

        spinnerCategory.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String selected = categories[position];
                loadMasters("Hamısı".equals(selected) ? null : selected);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        btnTabMasters.setOnClickListener(v -> {
            btnTabMasters.setBackgroundColor(Color.parseColor("#1B365D"));
            btnTabMasters.setTextColor(Color.WHITE);
            btnTabMyOrders.setBackgroundColor(Color.parseColor("#CBD5E1"));
            btnTabMyOrders.setTextColor(Color.parseColor("#1E293B"));
            spinnerCategory.setVisibility(View.VISIBLE);

            String selected = spinnerCategory.getSelectedItem().toString();
            loadMasters("Hamısı".equals(selected) ? null : selected);
        });

        btnTabMyOrders.setOnClickListener(v -> {
            btnTabMyOrders.setBackgroundColor(Color.parseColor("#1B365D"));
            btnTabMyOrders.setTextColor(Color.WHITE);
            btnTabMasters.setBackgroundColor(Color.parseColor("#CBD5E1"));
            btnTabMasters.setTextColor(Color.parseColor("#1E293B"));
            spinnerCategory.setVisibility(View.GONE);

            loadMyOrders();
        });
    }

    private void loadMasters(String category) {
        progressBar.setVisibility(View.VISIBLE);
        containerList.removeAllViews();

        RetrofitClient.getApiService().getMasters(category).enqueue(new Callback<List<User>>() {
            @Override
            public void onResponse(Call<List<User>> call, Response<List<User>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    List<User> masters = response.body();
                    if (masters.isEmpty()) {
                        addEmptyMessage("Bu kateqoriyada hələ usta yoxdur.");
                        return;
                    }
                    for (User master : masters) {
                        addMasterCard(master);
                    }
                } else {
                    Toast.makeText(CustomerHomeActivity.this, "Ustalar yüklənmədi", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<User>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                Toast.makeText(CustomerHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void addMasterCard(User master) {
        CardView card = new CardView(this);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 24);
        card.setLayoutParams(cardParams);
        card.setRadius(20f);
        card.setCardElevation(6f);
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(36, 32, 36, 32);

        TextView tvName = new TextView(this);
        tvName.setText(master.getFullName() + " • " + (master.getCategory() != null ? master.getCategory() : "Usta"));
        tvName.setTextSize(17f);
        tvName.setTextColor(Color.parseColor("#1B365D"));
        tvName.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView tvDetails = new TextView(this);
        String exp = (master.getExperience() != null && !master.getExperience().isEmpty()) ? master.getExperience() : "Qeyd edilməyib";
        String city = (master.getCity() != null && !master.getCity().isEmpty()) ? master.getCity() : "Bakı";
        tvDetails.setText("Şəhər: " + city + " | Təcrübə: " + exp + "\nTel: " + master.getPhone());
        tvDetails.setTextSize(14f);
        tvDetails.setTextColor(Color.parseColor("#475569"));
        tvDetails.setPadding(0, 8, 0, 12);

        Button btnOrder = new Button(this);
        btnOrder.setText("Sifariş Ver");
        btnOrder.setBackgroundColor(Color.parseColor("#2B6CB0"));
        btnOrder.setTextColor(Color.WHITE);
        btnOrder.setOnClickListener(v -> showCreateOrderDialog(master));

        inner.addView(tvName);
        inner.addView(tvDetails);
        inner.addView(btnOrder);
        card.addView(inner);
        containerList.addView(card);
    }

    private void showCreateOrderDialog(User master) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(master.getFullName() + " - Sifariş Yarat");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 12);

        EditText etTitle = new EditText(this);
        etTitle.setHint("İşin qısa adı (məs: Krant təmiri)");
        layout.addView(etTitle);

        EditText etDesc = new EditText(this);
        etDesc.setHint("Problemin ətraflı təsviri");
        layout.addView(etDesc);

        EditText etAddress = new EditText(this);
        etAddress.setHint("Ünvanınız (məs: Masazır, Yeni Bakı)");
        layout.addView(etAddress);

        builder.setView(layout);

        builder.setPositiveButton("Göndər", (dialog, which) -> {
            String title = etTitle.getText().toString().trim();
            String desc = etDesc.getText().toString().trim();
            String address = etAddress.getText().toString().trim();

            if (title.isEmpty() || address.isEmpty()) {
                Toast.makeText(this, "İşin adı və ünvan mütləqdir!", Toast.LENGTH_SHORT).show();
                return;
            }

            Order order = new Order();
            order.setCustomerId(currentUser.getId());
            order.setCustomerName(currentUser.getFullName());
            order.setCustomerPhone(currentUser.getPhone());
            order.setMasterId(master.getId());
            order.setMasterName(master.getFullName());
            order.setTitle(title);
            order.setDescription(desc);
            order.setAddress(address);
            order.setStatus("GOZLEMEDE");

            RetrofitClient.getApiService().createOrder(order).enqueue(new Callback<Order>() {
                @Override
                public void onResponse(Call<Order> call, Response<Order> response) {
                    if (response.isSuccessful()) {
                        Toast.makeText(CustomerHomeActivity.this, "Sifariş ustaya göndərildi!", Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(CustomerHomeActivity.this, "Sifariş göndərilmədi", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(Call<Order> call, Throwable t) {
                    Toast.makeText(CustomerHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        builder.setNegativeButton("Ləğv et", null);
        builder.show();
    }

    private void loadMyOrders() {
        if (currentUser == null) return;
        progressBar.setVisibility(View.VISIBLE);
        containerList.removeAllViews();

        RetrofitClient.getApiService().getCustomerOrders(currentUser.getId()).enqueue(new Callback<List<Order>>() {
            @Override
            public void onResponse(Call<List<Order>> call, Response<List<Order>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    List<Order> orders = response.body();
                    if (orders.isEmpty()) {
                        addEmptyMessage("Hələ heç bir sifariş verməmisiniz.");
                        return;
                    }
                    for (Order o : orders) {
                        addOrderCard(o);
                    }
                }
            }

            @Override
            public void onFailure(Call<List<Order>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                Toast.makeText(CustomerHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void addOrderCard(Order order) {
        CardView card = new CardView(this);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 24);
        card.setLayoutParams(cardParams);
        card.setRadius(20f);
        card.setCardElevation(6f);
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(36, 32, 36, 32);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(order.getTitle() + " (Usta: " + order.getMasterName() + ")");
        tvTitle.setTextSize(16f);
        tvTitle.setTextColor(Color.parseColor("#1B365D"));
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView tvInfo = new TextView(this);
        tvInfo.setText("Ünvan: " + order.getAddress() + "\nTəsvir: " + order.getDescription() + "\nStatus: " + order.getStatus());
        tvInfo.setTextSize(14f);
        tvInfo.setTextColor(Color.parseColor("#334155"));
        tvInfo.setPadding(0, 8, 0, 0);

        inner.addView(tvTitle);
        inner.addView(tvInfo);
        card.addView(inner);
        containerList.addView(card);
    }

    private void addEmptyMessage(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(15f);
        tv.setTextColor(Color.parseColor("#64748B"));
        tv.setPadding(16, 32, 16, 16);
        containerList.addView(tv);
    }
}