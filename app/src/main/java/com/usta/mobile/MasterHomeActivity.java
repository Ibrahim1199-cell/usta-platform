package com.usta.mobile;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
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

public class MasterHomeActivity extends AppCompatActivity {

    private User currentUser;
    private TextView tvWelcome;
    private Button btnRefresh, btnLogout;
    private ProgressBar progressBar;
    private LinearLayout containerOrders;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_master_home);

        currentUser = (User) getIntent().getSerializableExtra("user");

        tvWelcome = findViewById(R.id.tvMasterWelcome);
        btnRefresh = findViewById(R.id.btnMasterRefresh);
        btnLogout = findViewById(R.id.btnMasterLogout);
        progressBar = findViewById(R.id.progressMaster);
        containerOrders = findViewById(R.id.containerMasterOrders);

        if (currentUser != null) {
            tvWelcome.setText("Usta: " + currentUser.getFullName());
        }

        btnRefresh.setOnClickListener(v -> loadIncomingOrders());

        btnLogout.setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
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
                } else {
                    Toast.makeText(MasterHomeActivity.this, "Sifarişlər yüklənmədi", Toast.LENGTH_SHORT).show();
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
        cardParams.setMargins(0, 0, 0, 24);
        card.setLayoutParams(cardParams);
        card.setRadius(20f);
        card.setCardElevation(6f);
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(36, 32, 36, 32);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(order.getTitle() + " [" + order.getStatus() + "]");
        tvTitle.setTextSize(17f);
        tvTitle.setTextColor(Color.parseColor("#1B365D"));
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView tvDetails = new TextView(this);
        tvDetails.setText("Müştəri: " + order.getCustomerName() + " (" + order.getCustomerPhone() + ")" +
                "\nÜnvan: " + order.getAddress() +
                "\nTəsvir: " + order.getDescription());
        tvDetails.setTextSize(14f);
        tvDetails.setTextColor(Color.parseColor("#334155"));
        tvDetails.setPadding(0, 10, 0, 16);

        inner.addView(tvTitle);
        inner.addView(tvDetails);

        // Statusa görə əməliyyat düymələri
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        if ("GOZLEMEDE".equalsIgnoreCase(order.getStatus())) {
            Button btnAccept = new Button(this);
            btnAccept.setText("Qəbul Et");
            btnAccept.setBackgroundColor(Color.parseColor("#2F855A"));
            btnAccept.setTextColor(Color.WHITE);
            btnAccept.setOnClickListener(v -> changeStatus(order.getId(), "QEBUL_EDILDI"));

            Button btnReject = new Button(this);
            btnReject.setText("İmtina Et");
            btnReject.setBackgroundColor(Color.parseColor("#C53030"));
            btnReject.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams rejParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            rejParams.setMargins(20, 0, 0, 0);
            btnReject.setLayoutParams(rejParams);
            btnReject.setOnClickListener(v -> changeStatus(order.getId(), "IMTINA_EDILDI"));

            btnRow.addView(btnAccept);
            btnRow.addView(btnReject);
            inner.addView(btnRow);
        } else if ("QEBUL_EDILDI".equalsIgnoreCase(order.getStatus())) {
            Button btnComplete = new Button(this);
            btnComplete.setText("İşi Tamamla");
            btnComplete.setBackgroundColor(Color.parseColor("#2B6CB0"));
            btnComplete.setTextColor(Color.WHITE);
            btnComplete.setOnClickListener(v -> changeStatus(order.getId(), "TAMAMLANDI"));

            btnRow.addView(btnComplete);
            inner.addView(btnRow);
        }

        card.addView(inner);
        containerOrders.addView(card);
    }

    private void changeStatus(Long orderId, String newStatus) {
        progressBar.setVisibility(View.VISIBLE);
        RetrofitClient.getApiService().updateOrderStatus(orderId, newStatus).enqueue(new Callback<Order>() {
            @Override
            public void onResponse(Call<Order> call, Response<Order> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful()) {
                    Toast.makeText(MasterHomeActivity.this, "Status yeniləndi: " + newStatus, Toast.LENGTH_SHORT).show();
                    loadIncomingOrders();
                } else {
                    Toast.makeText(MasterHomeActivity.this, "Status dəyişdirilmədi", Toast.LENGTH_SHORT).show();
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