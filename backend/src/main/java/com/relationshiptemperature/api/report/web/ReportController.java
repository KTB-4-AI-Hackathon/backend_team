package com.relationshiptemperature.api.report.web;

import com.relationshiptemperature.api.auth.application.CurrentUserService;
import com.relationshiptemperature.api.common.api.ApiResponse;
import com.relationshiptemperature.api.relationship.application.RelationshipService;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.report.application.ReportService;
import com.relationshiptemperature.api.report.domain.RelationshipReport;
import com.relationshiptemperature.api.report.domain.ReportEvidence;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/relationships/{relationshipId}/report")
public class ReportController {

    private static final String DISCLAIMER =
            "대화에서 관찰된 패턴을 바탕으로 한 참고 정보이며 관계를 진단하거나 단정하지 않습니다.";

    private final CurrentUserService currentUserService;
    private final RelationshipService relationshipService;
    private final ReportService reportService;

    public ReportController(
            CurrentUserService currentUserService,
            RelationshipService relationshipService,
            ReportService reportService
    ) {
        this.currentUserService = currentUserService;
        this.relationshipService = relationshipService;
        this.reportService = reportService;
    }

    @GetMapping
    ApiResponse<ReportResponse> get(
            @PathVariable UUID relationshipId,
            @RequestParam(defaultValue = "8") @Min(4) @Max(52) int weeks
    ) {
        UUID userId = currentUserService.requireUserId();
        Relationship relationship = relationshipService.getOwned(userId, relationshipId);
        RelationshipReport report = reportService.latest(userId, relationshipId);
        List<ReportEvidence> evidences = reportService.evidences(report.getId());
        List<RelationshipReport> rawTrend = new ArrayList<>(reportService.trend(userId, relationshipId, weeks));
        Collections.reverse(rawTrend);
        return ApiResponse.of(ReportResponse.from(relationship, report, evidences, rawTrend));
    }

    record RelationshipIdentity(UUID id, String name, String initial, RelationshipType relationshipType) {}

    record Overall(int score, Integer change, String statusCode, String statusLabel) {}

    record EvidenceMetric(String name, Double currentValue, Double previousValue, String unit, String period) {}

    record EvidenceResponse(
            UUID id,
            String component,
            int score,
            String summary,
            EvidenceMetric metric
    ) {}

    record TrendPoint(String weekStart, String label, int score) {}

    record ReportResponse(
            UUID id,
            RelationshipIdentity relationship,
            Overall overall,
            RelationshipReport.PrqcScores prqc,
            List<EvidenceResponse> evidences,
            List<TrendPoint> trend,
            String analyzedAt,
            String modelVersion,
            String scoringPolicyVersion,
            String disclaimer
    ) {
        static ReportResponse from(
                Relationship relationship,
                RelationshipReport report,
                List<ReportEvidence> evidences,
                List<RelationshipReport> trend
        ) {
            return new ReportResponse(
                    report.getId(),
                    new RelationshipIdentity(
                            relationship.getId(), relationship.getName(), relationship.getInitial(),
                            relationship.getRelationshipType()
                    ),
                    overall(report),
                    report.getPrqcScores(),
                    evidences.stream().map(ReportController::fromEvidence).toList(),
                    trend.stream().map(item -> new TrendPoint(
                            item.getAnalyzedAt().atZone(ZoneId.of("Asia/Seoul")).toLocalDate().toString(),
                            "주간",
                            item.getOverallScore()
                    )).toList(),
                    report.getAnalyzedAt().toString(),
                    report.getModelVersion(),
                    report.getScoringPolicyVersion(),
                    DISCLAIMER
            );
        }

        private static Overall overall(RelationshipReport report) {
            int score = report.getOverallScore();
            if (score >= 80) return new Overall(score, report.getScoreChange(), "HEALTHY", "건강한 관계");
            if (score >= 60) return new Overall(score, report.getScoreChange(), "GOOD", "양호");
            if (score >= 40) return new Overall(score, report.getScoreChange(), "NEEDS_ATTENTION", "주의 필요");
            return new Overall(score, report.getScoreChange(), "CHANGE_DETECTED", "변화 감지");
        }
    }

    private static EvidenceResponse fromEvidence(ReportEvidence evidence) {
        ReportEvidence.Metric metric = evidence.getMetric();
        return new EvidenceResponse(
                evidence.getId(), evidence.getComponent(), evidence.getScore(), evidence.getSummary(),
                metric == null ? null : new EvidenceMetric(
                        metric.name(), metric.currentValue(), metric.previousValue(), metric.unit(), metric.period()
                )
        );
    }
}
