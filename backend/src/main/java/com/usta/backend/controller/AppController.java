package com.usta.backend.controller;

import com.usta.backend.model.Message;
import com.usta.backend.model.Order;
import com.usta.backend.model.User;
import com.usta.backend.repository.MessageRepository;
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

    @Autowired
    private MessageRepository messageRepository;

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

    // 8. Sifarişin Statusunu və Qiymətini Yeniləmək
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam String status,
            @RequestParam(required = false) Double price) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus(status);
            if (price != null) {
                order.setPrice(price);
            }
            return ResponseEntity.ok(orderRepository.save(order));
        }
        return ResponseEntity.notFound().build();
    }

    // 9. Müştərinin Tamamlanmış Sifarişə Ulduz və Rəy Verməsi
    @PostMapping("/orders/{orderId}/rate")
    public ResponseEntity<?> rateOrder(
            @PathVariable Long orderId,
            @RequestParam Integer rating,
            @RequestParam(required = false) String review) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            if (order.getRating() != null) {
                return ResponseEntity.badRequest().body("Bu sifariş artıq qiymətləndirilib!");
            }
            order.setRating(rating);
            order.setReview(review);
            orderRepository.save(order);

            if (order.getMasterId() != null) {
                userRepository.findById(order.getMasterId()).ifPresent(master -> {
                    int count = master.getRatingCount() != null ? master.getRatingCount() : 0;
                    double currentAvg = master.getRating() != null ? master.getRating() : 0.0;
                    double newAvg = ((currentAvg * count) + rating) / (count + 1);
                    master.setRatingCount(count + 1);
                    master.setRating(Math.round(newAvg * 10.0) / 10.0);
                    userRepository.save(master);
                });
            }
            return ResponseEntity.ok(order);
        }
        return ResponseEntity.notFound().build();
    }

    // 10. İstifadəçi məlumatlarını gətir
    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 11. Profil və Portfolio yeniləmək
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable Long id, @RequestBody User updated) {
        return userRepository.findById(id).map(user -> {
            if (updated.getFullName() != null) user.setFullName(updated.getFullName());
            if (updated.getCity() != null) user.setCity(updated.getCity());
            if (updated.getCategory() != null) user.setCategory(updated.getCategory());
            if (updated.getExperience() != null) user.setExperience(updated.getExperience());
            if (updated.getAbout() != null) user.setAbout(updated.getAbout());
            if (updated.getAvatarUrl() != null) user.setAvatarUrl(updated.getAvatarUrl());
            if (updated.getPortfolioUrls() != null) user.setPortfolioUrls(updated.getPortfolioUrls());
            if (updated.getAvailable() != null) user.setAvailable(updated.getAvailable());
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 12. Ustanın bütün rəylərini gətir
    @GetMapping("/masters/{masterId}/reviews")
    public List<Order> getMasterReviews(@PathVariable Long masterId) {
        return orderRepository.findByMasterIdAndRatingIsNotNullOrderByIdDesc(masterId);
    }

    // 13. Ustanın rəyə cavab (geri dönüş) yazması
    @PostMapping("/orders/{orderId}/reply")
    public ResponseEntity<?> replyToReview(@PathVariable Long orderId, @RequestParam String reply) {
        return orderRepository.findById(orderId).map(order -> {
            order.setMasterReply(reply);
            return ResponseEntity.ok(orderRepository.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 14. Sifariş daxili mesajları gətir
    @GetMapping("/orders/{orderId}/messages")
    public List<Message> getOrderMessages(@PathVariable Long orderId) {
        return messageRepository.findByOrderIdOrderByIdAsc(orderId);
    }

    // 15. Sifariş daxili mesaj və ya şəkil göndər
    @PostMapping("/orders/{orderId}/messages")
    public Message sendOrderMessage(@PathVariable Long orderId, @RequestBody Message message) {
        message.setOrderId(orderId);
        return messageRepository.save(message);
    }
}