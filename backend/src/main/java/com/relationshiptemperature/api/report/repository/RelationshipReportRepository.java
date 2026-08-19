package com.relationshiptemperature.api.report.repository;

import com.relationshiptemperature.api.report.domain.RelationshipReport;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelationshipReportRepository extends JpaRepository<RelationshipReport, UUID> {

    Optional<RelationshipReport> findFirstByRelationshipIdOrderByAnalyzedAtDesc(UUID relationshipId);

    Optional<RelationshipReport> findFirstByRelationshipIdAndUserIdOrderByAnalyzedAtDesc(UUID relationshipId, UUID userId);

    List<RelationshipReport> findTop52ByRelationshipIdAndUserIdOrderByAnalyzedAtDesc(UUID relationshipId, UUID userId);
}
