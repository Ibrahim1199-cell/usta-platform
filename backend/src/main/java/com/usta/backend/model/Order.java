package com.usta.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long customerId;      // Sifarişi verən müştərinin ID-si
    private String customerName;  // Müştərinin adı
    private String customerPhone; // Müştərinin əlaqə nömrəsi

    private Long masterId;        // Seçilən ustanın ID-si
    private String masterName;    // Ustanın adı

    private String title;         // Problemin qısa başlığı (məs: Kran su buraxır)
    private String description;   // Ətraflı təsvir
    private String address;       // Ünvan

    private String status;        // "GOZLEMEDE", "QEBUL_EDILDI", "TAMAMLANDI", "IMTINA_EDILDI"
    private LocalDateTime createdAt = LocalDateTime.now();
}