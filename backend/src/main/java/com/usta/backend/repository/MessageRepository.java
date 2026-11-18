package com.usta.backend.repository;

import com.usta.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByOrderIdOrderByIdAsc(Long orderId);
}