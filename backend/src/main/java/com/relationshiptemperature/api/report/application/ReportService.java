package com.relationshiptemperature.api.report.application;

import com.relationshiptemperature.api.analysis.application.AiAnalysisClient.AnalysisResult;
import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.repository.RelationshipRepository;
import com.relationshiptemperature.api.report.domain.RelationshipReport;
import com.relationshiptemperature.api.report.domain.ReportEvidence;
import com.relationshiptemperature.api.report.repository.RelationshipReportRepository;
import com.relationshiptemperature.api.report.repository.ReportEvidenceRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final RelationshipReportRepository reportRepository;
    private final ReportEvidenceRepository evidenceRepository;
    private final RelationshipScoringPolicy scoringPolicy;
    private final RelationshipRepository relationshipRepository;

    public ReportService(
            RelationshipReportRepository reportRepository,
            ReportEvidenceRepository evidenceRepository,
            RelationshipScoringPolicy scoringPolicy,
            RelationshipRepository relationshipRepository
    ) {
        this.reportRepository = reportRepository;
        this.evidenceRepository = evidenceRepository;
        this.scoringPolicy = scoringPolicy;
        this.relationshipRepository = relationshipRepository;
    }

    @Transactional
    public RelationshipReport create(UUID jobId, Relationship relationship, AnalysisResult result) {
        int overall = scoringPolicy.calculate(relationship.getRelationshipType(), result.components());
        Integer previous = reportRepository.findFirstByRelationshipIdOrderByAnalyzedAtDesc(relationship.getId())
                .map(RelationshipReport::getOverallScore)
                .orElse(null);
        Integer change = previous == null ? null : overall - previous;
        Instant analyzedAt = Instant.now();
        RelationshipReport report = reportRepository.save(new RelationshipReport(
                relationship.getUserId(), relationship.getId(), jobId, overall, change, result.components(),
                result.modelVersion(), RelationshipScoringPolicy.VERSION, analyzedAt
        ));
        List<ReportEvidence> evidences = result.evidences().stream()
                .map(evidence -> new ReportEvidence(
                        report.getId(), evidence.component(), evidence.score(), evidence.summary(), evidence.metric()
                ))
                .toList();
        evidenceRepository.saveAll(evidences);
        relationship.completeAnalysis(overall, change, analyzedAt);
        relationshipRepository.save(relationship);
        return report;
    }

    public RelationshipReport latest(UUID userId, UUID relationshipId) {
        return reportRepository.findFirstByRelationshipIdAndUserIdOrderByAnalyzedAtDesc(relationshipId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    public List<RelationshipReport> trend(UUID userId, UUID relationshipId, int weeks) {
        return reportRepository.findTop52ByRelationshipIdAndUserIdOrderByAnalyzedAtDesc(relationshipId, userId)
                .stream().limit(weeks).toList();
    }

    public List<ReportEvidence> evidences(UUID reportId) {
        return evidenceRepository.findAllByReportIdOrderByScoreAsc(reportId);
    }
}
