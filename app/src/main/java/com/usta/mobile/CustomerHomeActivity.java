package com.usta.mobile;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RatingBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.usta.mobile.api.RetrofitClient;
import com.usta.mobile.model.Order;
import com.usta.mobile.model.User;
import com.usta.mobile.util.SessionManager;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CustomerHomeActivity extends AppCompatActivity {

    private User currentUser;
    private TextView tvHeaderTitle, tvProfileInfo;
    private ProgressBar progressBar;
    private LinearLayout layoutMasters, layoutOrders, layoutProfile;
    private LinearLayout containerMasters, containerOrders;
    private Spinner spinnerCategory;
    private EditText etFilterCity;
    private List<User> allFetchedMasters = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_customer_home);

        currentUser = (User) getIntent().getSerializableExtra("user");
        if (currentUser == null) {
            currentUser = new SessionManager(this).getUser();
        }

        tvHeaderTitle = findViewById(R.id.tvCustHeaderTitle);
        progressBar = findViewById(R.id.progressCustomer);
        layoutMasters = findViewById(R.id.layoutCustMasters);
        layoutOrders = findViewById(R.id.layoutCustOrders);
        layoutProfile = findViewById(R.id.layoutCustProfile);
        containerMasters = findViewById(R.id.containerMasters);
        containerOrders = findViewById(R.id.containerCustomerOrders);
        spinnerCategory = findViewById(R.id.spinnerFilterCategory);
        etFilterCity = findViewById(R.id.etFilterCity);
        tvProfileInfo = findViewById(R.id.tvCustProfileInfo);

        if (currentUser != null) {
            tvProfileInfo.setText("Ad Soyad: " + currentUser.getFullName() +
                    "\nTelefon: " + currentUser.getPhone() +
                    "\nŞəhər: " + (currentUser.getCity() != null ? currentUser.getCity() : "-") +
                    "\nStatus: Müştəri");
        }

        String[] categories = {"Hamısı", "Santexnik", "Elektrik", "Mebel ustası", "Kombi ustası", "Təmir-tikinti", "Avto usta", "Digər"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, categories);
        spinnerCategory.setAdapter(adapter);

        spinnerCategory.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                loadMasters(categories[position]);
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        etFilterCity.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                renderFilteredMasters();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        findViewById(R.id.btnRefreshCustOrders).setOnClickListener(v -> loadMyOrders());

        findViewById(R.id.btnCustLogout).setOnClickListener(v -> {
            new SessionManager(this).logout();
            startActivity(new Intent(this, MainActivity.class));
            finish();
        });

        BottomNavigationView bottomNav = findViewById(R.id.bottomNavCustomer);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            layoutMasters.setVisibility(id == R.id.nav_cust_masters ? View.VISIBLE : View.GONE);
            layoutOrders.setVisibility(id == R.id.nav_cust_orders ? View.VISIBLE : View.GONE);
            layoutProfile.setVisibility(id == R.id.nav_cust_profile ? View.VISIBLE : View.GONE);

            if (id == R.id.nav_cust_masters) {
                tvHeaderTitle.setText("Ustalar");
            } else if (id == R.id.nav_cust_orders) {
                tvHeaderTitle.setText("Sifarişlərim");
                loadMyOrders();
            } else if (id == R.id.nav_cust_profile) {
                tvHeaderTitle.setText("Profilim");
            }
            return true;
        });
    }

    private void loadMasters(String category) {
        progressBar.setVisibility(View.VISIBLE);
        String queryCat = "Hamısı".equals(category) ? null : category;

        RetrofitClient.getApiService().getMasters(queryCat).enqueue(new Callback<List<User>>() {
            @Override
            public void onResponse(Call<List<User>> call, Response<List<User>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    allFetchedMasters = response.body();
                    renderFilteredMasters();
                }
            }
            @Override
            public void onFailure(Call<List<User>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                Toast.makeText(CustomerHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void renderFilteredMasters() {
        containerMasters.removeAllViews();
        String cityFilter = etFilterCity.getText().toString().trim().toLowerCase();

        for (User master : allFetchedMasters) {
            if (!cityFilter.isEmpty()) {
                String mCity = master.getCity() != null ? master.getCity().toLowerCase() : "";
                if (!mCity.contains(cityFilter)) continue;
            }
            addMasterCard(master);
        }
    }

    private void addMasterCard(User master) {
        CardView card = new CardView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, 0, 20);
        card.setLayoutParams(params);
        card.setRadius(18f);
        card.setCardElevation(5f);
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(32, 28, 32, 28);

        String ratingText = master.getRatingCount() > 0
                ? "⭐ " + master.getRating() + " (" + master.getRatingCount() + " rəy)"
                : "⭐ Yeni usta";

        TextView tvName = new TextView(this);
        tvName.setText(master.getFullName() + "  •  " + ratingText);
        tvName.setTextSize(17f);
        tvName.setTextColor(Color.parseColor("#0F172A"));
        tvName.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView tvInfo = new TextView(this);
        tvInfo.setText("Sahə: " + master.getCategory() + " | Şəhər: " + master.getCity() +
                "\nTəcrübə: " + (master.getExperience() != null ? master.getExperience() + " il" : "-") +
                "\nHaqqında: " + (master.getAbout() != null ? master.getAbout() : ""));
        tvInfo.setTextSize(14f);
        tvInfo.setTextColor(Color.parseColor("#475569"));
        tvInfo.setPadding(0, 8, 0, 14);

        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        Button btnOrder = new Button(this);
        btnOrder.setText("Sifariş Ver");
        btnOrder.setBackgroundColor(Color.parseColor("#0F172A"));
        btnOrder.setTextColor(Color.WHITE);
        btnOrder.setOnClickListener(v -> showCreateOrderDialog(master));

        Button btnCall = new Button(this);
        btnCall.setText("Zəng Et");
        btnCall.setBackgroundColor(Color.parseColor("#1E293B"));
        btnCall.setTextColor(Color.WHITE);
        LinearLayout.LayoutParams callParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        callParams.setMargins(20, 0, 0, 0);
        btnCall.setLayoutParams(callParams);
        btnCall.setOnClickListener(v -> {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + master.getPhone()));
            startActivity(dialIntent);
        });

        btnRow.addView(btnOrder);
        btnRow.addView(btnCall);

        inner.addView(tvName);
        inner.addView(tvInfo);
        inner.addView(btnRow);
        card.addView(inner);
        containerMasters.addView(card);
    }

    private void showCreateOrderDialog(User master) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Sifariş: " + master.getFullName());

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 16);

        EditText etTitle = new EditText(this);
        etTitle.setHint("İşin qısa adı (məs: Krant təmiri)");
        EditText etDesc = new EditText(this);
        etDesc.setHint("Problemin təsviri");
        EditText etAddress = new EditText(this);
        etAddress.setHint("Ünvan");

        layout.addView(etTitle);
        layout.addView(etDesc);
        layout.addView(etAddress);
        builder.setView(layout);

        builder.setPositiveButton("Göndər", (dialog, which) -> {
            Order order = new Order();
            order.setCustomerId(currentUser.getId());
            order.setCustomerName(currentUser.getFullName());
            order.setCustomerPhone(currentUser.getPhone());
            order.setMasterId(master.getId());
            order.setMasterName(master.getFullName());
            order.setTitle(etTitle.getText().toString().trim());
            order.setDescription(etDesc.getText().toString().trim());
            order.setAddress(etAddress.getText().toString().trim());

            progressBar.setVisibility(View.VISIBLE);
            RetrofitClient.getApiService().createOrder(order).enqueue(new Callback<Order>() {
                @Override
                public void onResponse(Call<Order> call, Response<Order> response) {
                    progressBar.setVisibility(View.GONE);
                    if (response.isSuccessful()) {
                        Toast.makeText(CustomerHomeActivity.this, "Sifariş göndərildi!", Toast.LENGTH_SHORT).show();
                    }
                }
                @Override
                public void onFailure(Call<Order> call, Throwable t) {
                    progressBar.setVisibility(View.GONE);
                }
            });
        });
        builder.setNegativeButton("Ləğv et", null);
        builder.show();
    }

    private void loadMyOrders() {
        if (currentUser == null) return;
        progressBar.setVisibility(View.VISIBLE);
        containerOrders.removeAllViews();

        RetrofitClient.getApiService().getCustomerOrders(currentUser.getId()).enqueue(new Callback<List<Order>>() {
            @Override
            public void onResponse(Call<List<Order>> call, Response<List<Order>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    for (Order o : response.body()) {
                        addCustomerOrderCard(o);
                    }
                }
            }
            @Override
            public void onFailure(Call<List<Order>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
            }
        });
    }

    private void addCustomerOrderCard(Order order) {
        CardView card = new CardView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, 0, 20);
        card.setLayoutParams(params);
        card.setRadius(18f);
        card.setCardElevation(5f);
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(32, 28, 32, 28);

        TextView tvStatus = new TextView(this);
        tvStatus.setText("Status: " + order.getStatus());
        tvStatus.setTextSize(13f);
        tvStatus.setTypeface(null, android.graphics.Typeface.BOLD);
        if ("QEBUL_EDILDI".equalsIgnoreCase(order.getStatus())) tvStatus.setTextColor(Color.parseColor("#2F855A"));
        else if ("IMTINA_EDILDI".equalsIgnoreCase(order.getStatus())) tvStatus.setTextColor(Color.parseColor("#C53030"));
        else if ("TAMAMLANDI".equalsIgnoreCase(order.getStatus())) tvStatus.setTextColor(Color.parseColor("#2B6CB0"));
        else tvStatus.setTextColor(Color.parseColor("#D69E2E"));

        TextView tvTitle = new TextView(this);
        tvTitle.setText(order.getTitle() + " (Usta: " + order.getMasterName() + ")");
        tvTitle.setTextSize(16f);
        tvTitle.setTextColor(Color.parseColor("#1E293B"));
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

        String priceStr = order.getPrice() != null ? "\nTəklif olunan qiymət: " + order.getPrice() + " AZN" : "";
        TextView tvDesc = new TextView(this);
        tvDesc.setText("Ünvan: " + order.getAddress() + "\nTəsvir: " + order.getDescription() + priceStr);
        tvDesc.setTextSize(14f);
        tvDesc.setTextColor(Color.parseColor("#475569"));
        tvDesc.setPadding(0, 6, 0, 12);

        inner.addView(tvStatus);
        inner.addView(tvTitle);
        inner.addView(tvDesc);

        if ("TAMAMLANDI".equalsIgnoreCase(order.getStatus())) {
            if (order.getRating() == null) {
                Button btnRate = new Button(this);
                btnRate.setText("⭐ Ustanı Qiymətləndir");
                btnRate.setBackgroundColor(Color.parseColor("#D69E2E"));
                btnRate.setTextColor(Color.WHITE);
                btnRate.setOnClickListener(v -> showRateDialog(order));
                inner.addView(btnRate);
            } else {
                TextView tvRated = new TextView(this);
                tvRated.setText("Sizin qiymətiniz: ⭐ " + order.getRating() + "/5" +
                        (order.getReview() != null && !order.getReview().isEmpty() ? " (\"" + order.getReview() + "\")" : ""));
                tvRated.setTextColor(Color.parseColor("#2F855A"));
                tvRated.setTypeface(null, android.graphics.Typeface.BOLD);
                inner.addView(tvRated);
            }
        }

        card.addView(inner);
        containerOrders.addView(card);
    }

    private void showRateDialog(Order order) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Ustanı Qiymətləndir");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 16);

        RatingBar ratingBar = new RatingBar(this);
        ratingBar.setNumStars(5);
        ratingBar.setStepSize(1.0f);
        ratingBar.setRating(5.0f);
        LinearLayout.LayoutParams rbParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        ratingBar.setLayoutParams(rbParams);

        EditText etReview = new EditText(this);
        etReview.setHint("Rəyiniz (istəyə bağlı)");

        layout.addView(ratingBar);
        layout.addView(etReview);
        builder.setView(layout);

        builder.setPositiveButton("Təsdiqlə", (dialog, which) -> {
            int stars = Math.max(1, (int) ratingBar.getRating());
            String reviewText = etReview.getText().toString().trim();

            progressBar.setVisibility(View.VISIBLE);
            RetrofitClient.getApiService().rateOrder(order.getId(), stars, reviewText).enqueue(new Callback<Order>() {
                @Override
                public void onResponse(Call<Order> call, Response<Order> response) {
                    progressBar.setVisibility(View.GONE);
                    if (response.isSuccessful()) {
                        Toast.makeText(CustomerHomeActivity.this, "Təşəkkürlər, rəyiniz qeydə alındı!", Toast.LENGTH_SHORT).show();
                        loadMyOrders();
                    }
                }
                @Override
                public void onFailure(Call<Order> call, Throwable t) {
                    progressBar.setVisibility(View.GONE);
                }
            });
        });
        builder.setNegativeButton("Ləğv et", null);
        builder.show();
    }
}