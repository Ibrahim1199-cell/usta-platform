package com.usta.mobile;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.usta.mobile.api.RetrofitClient;
import com.usta.mobile.model.Order;
import com.usta.mobile.model.User;
import com.usta.mobile.util.SessionManager;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MasterHomeActivity extends AppCompatActivity {

    private User currentUser;
    private TextView tvHeaderTitle, tvProfileInfo;
    private ProgressBar progressBar;
    private LinearLayout layoutOrders, layoutProfile, containerOrders;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_master_home);

        currentUser = (User) getIntent().getSerializableExtra("user");
        if (currentUser == null) {
            currentUser = new SessionManager(this).getUser();
        }

        tvHeaderTitle = findViewById(R.id.tvMasterHeaderTitle);
        progressBar = findViewById(R.id.progressMaster);
        layoutOrders = findViewById(R.id.layoutMasterOrders);
        layoutProfile = findViewById(R.id.layoutMasterProfile);
        containerOrders = findViewById(R.id.containerMasterOrders);
        tvProfileInfo = findViewById(R.id.tvMasterProfileInfo);

        if (currentUser != null) {
            tvProfileInfo.setText("Ad Soyad: " + currentUser.getFullName() +
                    "\nTelefon: " + currentUser.getPhone() +
                    "\nİxtisas: " + currentUser.getCategory() +
                    "\nŞəhər: " + currentUser.getCity() +
                    "\nReytinq: ⭐ " + currentUser.getRating() + " (" + currentUser.getRatingCount() + " rəy)");
        }

        findViewById(R.id.btnMasterRefresh).setOnClickListener(v -> loadIncomingOrders());

        findViewById(R.id.btnMasterLogout).setOnClickListener(v -> {
            new SessionManager(this).logout();
            startActivity(new Intent(this, MainActivity.class));
            finish();
        });

        BottomNavigationView bottomNav = findViewById(R.id.bottomNavMaster);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            layoutOrders.setVisibility(id == R.id.nav_master_orders ? View.VISIBLE : View.GONE);
            layoutProfile.setVisibility(id == R.id.nav_master_profile ? View.VISIBLE : View.GONE);
            tvHeaderTitle.setText(id == R.id.nav_master_orders ? "Gələn Sifarişlər" : "Usta Profilim");
            if (id == R.id.nav_master_orders) loadIncomingOrders();
            return true;
        });

        loadIncomingOrders();
    }

    private void loadIncomingOrders() {
        if (currentUser == null) return;
        progressBar.setVisibility(View.VISIBLE);
        containerOrders.removeAllViews();

        RetrofitClient.getApiService().getMasterOrders(currentUser.getId()).enqueue(new Callback<List<Order>>() {
            @Override
            public void onResponse(Call<List<Order>> call, Response<List<Order>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    List<Order> orders = response.body();
                    if (orders.isEmpty()) {
                        TextView tvEmpty = new TextView(MasterHomeActivity.this);
                        tvEmpty.setText("Hələ sizə yeni sifariş gəlməyib.");
                        tvEmpty.setTextSize(15f);
                        tvEmpty.setTextColor(Color.parseColor("#64748B"));
                        tvEmpty.setPadding(16, 32, 16, 16);
                        containerOrders.addView(tvEmpty);
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
                Toast.makeText(MasterHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void addOrderCard(Order order) {
        CardView card = new CardView(this);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 20);
        card.setLayoutParams(cardParams);
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
        tvTitle.setText(order.getTitle());
        tvTitle.setTextSize(17f);
        tvTitle.setTextColor(Color.parseColor("#0F172A"));
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

        String priceStr = order.getPrice() != null ? "\nRazılaşdırılmış qiymət: " + order.getPrice() + " AZN" : "";
        String ratingStr = order.getRating() != null ? "\nMüştəri rəyi: ⭐ " + order.getRating() + "/5" : "";

        TextView tvDetails = new TextView(this);
        tvDetails.setText("Müştəri: " + order.getCustomerName() + " (" + order.getCustomerPhone() + ")" +
                "\nÜnvan: " + order.getAddress() +
                "\nTəsvir: " + order.getDescription() + priceStr + ratingStr);
        tvDetails.setTextSize(14f);
        tvDetails.setTextColor(Color.parseColor("#334155"));
        tvDetails.setPadding(0, 8, 0, 14);

        inner.addView(tvStatus);
        inner.addView(tvTitle);
        inner.addView(tvDetails);

        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        // Birbaşa Zəng Düyməsi
        Button btnCall = new Button(this);
        btnCall.setText("Zəng Et");
        btnCall.setBackgroundColor(Color.parseColor("#1E293B"));
        btnCall.setTextColor(Color.WHITE);
        btnCall.setOnClickListener(v -> {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + order.getCustomerPhone()));
            startActivity(dialIntent);
        });
        btnRow.addView(btnCall);

        if ("GOZLEMEDE".equalsIgnoreCase(order.getStatus())) {
            Button btnAccept = new Button(this);
            btnAccept.setText("Qəbul Et");
            btnAccept.setBackgroundColor(Color.parseColor("#2D5A3C"));
            btnAccept.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams accParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            accParams.setMargins(16, 0, 0, 0);
            btnAccept.setLayoutParams(accParams);
            btnAccept.setOnClickListener(v -> showAcceptPriceDialog(order.getId()));

            Button btnReject = new Button(this);
            btnReject.setText("İmtina");
            btnReject.setBackgroundColor(Color.parseColor("#C53030"));
            btnReject.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams rejParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            rejParams.setMargins(16, 0, 0, 0);
            btnReject.setLayoutParams(rejParams);
            btnReject.setOnClickListener(v -> changeStatus(order.getId(), "IMTINA_EDILDI", null));

            btnRow.addView(btnAccept);
            btnRow.addView(btnReject);
        } else if ("QEBUL_EDILDI".equalsIgnoreCase(order.getStatus())) {
            Button btnComplete = new Button(this);
            btnComplete.setText("İşi Tamamla");
            btnComplete.setBackgroundColor(Color.parseColor("#2D5A3C"));
            btnComplete.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams compParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            compParams.setMargins(16, 0, 0, 0);
            btnComplete.setLayoutParams(compParams);
            btnComplete.setOnClickListener(v -> changeStatus(order.getId(), "TAMAMLANDI", order.getPrice()));

            btnRow.addView(btnComplete);
        }

        inner.addView(btnRow);
        card.addView(inner);
        containerOrders.addView(card);
    }

    private void showAcceptPriceDialog(Long orderId) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Sifarişi Qəbul Et");
        builder.setMessage("Təxmini xidmət haqqını (AZN) daxil edin:");

        EditText etPrice = new EditText(this);
        etPrice.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        etPrice.setHint("Məs: 30");
        builder.setView(etPrice);

        builder.setPositiveButton("Təsdiqlə", (dialog, which) -> {
            String pStr = etPrice.getText().toString().trim();
            Double price = pStr.isEmpty() ? null : Double.parseDouble(pStr);
            changeStatus(orderId, "QEBUL_EDILDI", price);
        });
        builder.setNegativeButton("Ləğv et", null);
        builder.show();
    }

    private void changeStatus(Long orderId, String newStatus, Double price) {
        progressBar.setVisibility(View.VISIBLE);
        RetrofitClient.getApiService().updateOrderStatus(orderId, newStatus, price).enqueue(new Callback<Order>() {
            @Override
            public void onResponse(Call<Order> call, Response<Order> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful()) {
                    Toast.makeText(MasterHomeActivity.this, "Status yeniləndi!", Toast.LENGTH_SHORT).show();
                    loadIncomingOrders();
                }
            }
            @Override
            public void onFailure(Call<Order> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                Toast.makeText(MasterHomeActivity.this, "Xəta: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}