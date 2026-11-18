package com.usta.backend.repository;

import com.usta.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    // Müştərinin verdiyi sifarişləri gətirmək
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // Ustanın adına gələn sifarişləri gətirmək
    List<Order> findByMasterIdOrderByCreatedAtDesc(Long masterId);

    List<Order> findByMasterIdAndRatingIsNotNullOrderByIdDesc(Long masterId);
}