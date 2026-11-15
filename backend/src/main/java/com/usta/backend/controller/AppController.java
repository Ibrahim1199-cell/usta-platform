package com.usta.backend.controller;

import com.usta.backend.model.Order;
import com.usta.backend.model.User;
import com.usta.backend.repository.OrderRepository;
import com.usta.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AppController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    // 1. Serverin işlədiyini yoxlamaq üçün test ünvanı
    @GetMapping("/test")
    public String test() {
        return "Usta-Musteri Serveri Tam Islekdir!";
    }

    // 2. Qeydiyyat (Həm Müştəri, həm Usta üçün)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByPhone(user.getPhone()).isPresent()) {
            return ResponseEntity.badRequest().body("Bu telefon nomresi artiq qeydiyyatdan kecib!");
        }
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    // 3. Hesaba Giriş (Login)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String phone = loginData.get("phone");
        String password = loginData.get("password");

        Optional<User> userOpt = userRepository.findByPhone(phone);
        if (userOpt.isPresent() && userOpt.get().getPassword().equals(password)) {
            return ResponseEntity.ok(userOpt.get());
        }
        return ResponseEntity.status(401).body("Telefon nomresi ve ya sifre yanlisdir!");
    }

    // 4. Bütün Ustaların Siyahısı (İstəyə görə kateqoriya ilə)
    @GetMapping("/masters")
    public List<User> getMasters(@RequestParam(required = false) String category) {
        if (category != null && !category.isEmpty() && !category.equalsIgnoreCase("Hamısı")) {
            return userRepository.findByRoleAndCategoryIgnoreCase("USTA", category);
        }
        return userRepository.findByRole("USTA");
    }

    // 5. Yeni Sifariş Yaratmaq (Müştəri tərəfindən)
    @PostMapping("/orders")
    public Order createOrder(@RequestBody Order order) {
        order.setStatus("GOZLEMEDE");
        return orderRepository.save(order);
    }

    // 6. Müştərinin Öz Sifarişləri
    @GetMapping("/orders/customer/{customerId}")
    public List<Order> getCustomerOrders(@PathVariable Long customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    // 7. Ustaya Gələn Sifarişlər
    @GetMapping("/orders/master/{masterId}")
    public List<Order> getMasterOrders(@PathVariable Long masterId) {
        return orderRepository.findByMasterIdOrderByCreatedAtDesc(masterId);
    }

    // 8. Sifarişin Statusunu Dəyişmək (Usta Qəbul edir / İmtina edir / Tamamlayır)
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long orderId, @RequestParam String status) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus(status);
            return ResponseEntity.ok(orderRepository.save(order));
        }
        return ResponseEntity.notFound().build();
    }
}