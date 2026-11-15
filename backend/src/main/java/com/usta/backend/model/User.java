package com.usta.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;      // Ad və Soyad

    @Column(unique = true, nullable = false)
    private String phone;         // Telefon nömrəsi (Giriş üçün)

    @Column(nullable = false)
    private String password;      // Şifrə

    private String role;          // "MUSTERI" və ya "USTA"
    private String city;          // Şəhər (məs: Bakı, Sumqayıt)

    // Yalnız USTA olanlar üçün doldurulacaq hissələr:
    private String category;      // Peşəsi (məs: Santexnik, Elektrik, Kombi ustası)
    private Integer experience;   // Təcrübə ili (məs: 5)

    @Column(columnDefinition = "TEXT")
    private String about;         // Usta haqqında qısa məlumat

    // Reytinq sahələri:
    private Double rating = 0.0;
    private Integer ratingCount = 0;

    public Double getRating() {
        return rating != null ? rating : 0.0;
    }

    public Integer getRatingCount() {
        return ratingCount != null ? ratingCount : 0;
    }
}