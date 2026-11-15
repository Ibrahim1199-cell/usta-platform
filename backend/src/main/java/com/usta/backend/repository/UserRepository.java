package com.usta.backend.repository;

import com.usta.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Telefon nömrəsinə görə istifadəçini tapmaq (Giriş zamanı)
    Optional<User> findByPhone(String phone);

    // Yalnız "USTA" rolunda olanları gətirmək
    List<User> findByRole(String role);

    // Kateqoriyaya görə ustaları filtrləmək (məs: Santexnik)
    List<User> findByRoleAndCategoryIgnoreCase(String role, String category);
}