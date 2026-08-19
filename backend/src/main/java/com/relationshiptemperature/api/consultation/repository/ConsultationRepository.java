package com.relationshiptemperature.api.consultation.repository;

import com.relationshiptemperature.api.consultation.domain.Consultation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    Optional<Consultation> findByIdAndUserId(UUID id, UUID userId);

    List<Consultation> findAllByUserIdOrderByUpdatedAtDesc(UUID userId);
}
