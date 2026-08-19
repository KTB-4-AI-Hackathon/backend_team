package com.relationshiptemperature.api.consultation.repository;

import com.relationshiptemperature.api.consultation.domain.ChatMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findAllByConsultationIdOrderByCreatedAtAsc(UUID consultationId);
}
