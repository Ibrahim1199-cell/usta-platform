package com.usta.mobile.model;

import java.io.Serializable;

public class User implements Serializable {
    private Long id;
    private String fullName;
    private String phone;
    private String password;
    private String role;       // "MUSTERI" və ya "USTA"
    private String city;
    private String category;
    private String experience;
    private String about;

    public User() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }

    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }

    private Double rating;
    private Integer ratingCount;

    public Double getRating() { return rating != null ? rating : 0.0; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getRatingCount() { return ratingCount != null ? ratingCount : 0; }
    public void setRatingCount(Integer ratingCount) { this.ratingCount = ratingCount; }


}