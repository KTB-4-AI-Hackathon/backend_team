package com.relationshiptemperature.api.dashboard.web;

import com.relationshiptemperature.api.auth.application.CurrentUserService;
import com.relationshiptemperature.api.common.api.ApiResponse;
import com.relationshiptemperature.api.dashboard.application.DashboardService;
import com.relationshiptemperature.api.dashboard.application.DashboardService.DashboardView;
import com.relationshiptemperature.api.dashboard.application.DashboardService.Sort;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final CurrentUserService currentUserService;
    private final DashboardService dashboardService;

    public DashboardController(CurrentUserService currentUserService, DashboardService dashboardService) {
        this.currentUserService = currentUserService;
        this.dashboardService = dashboardService;
    }

    @GetMapping
    ApiResponse<DashboardResponse> get(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekOf,
            @RequestParam(defaultValue = "ABS_CHANGE_DESC") Sort sort
    ) {
        return ApiResponse.of(DashboardResponse.from(
                dashboardService.get(currentUserService.requireUserId(), weekOf, sort)
        ));
    }

    record Week(LocalDate startDate, LocalDate endDate, String label) {}
    record Summary(int relationshipCount, Integer averageScore, Integer averageChange) {}
    record RelationshipCard(
            UUID id,
            String name,
            String initial,
            RelationshipType relationshipType,
            Integer score,
            String statusCode,
            String statusLabel,
            Integer change,
            String lastAnalyzedAt,
            List<Integer> sparkline
    ) {}
    record LargestChange(UUID relationshipId, String name, Integer change, List<Integer> sparkline) {}
    record Attention(UUID relationshipId, String name, Integer score, String reasonCode, String reasonLabel) {}
    record DashboardResponse(
            Week week,
            Summary summary,
            List<RelationshipCard> relationships,
            List<LargestChange> largestChanges,
            List<Attention> needsAttention
    ) {
        static DashboardResponse from(DashboardView view) {
            return new DashboardResponse(
                    new Week(view.startDate(), view.endDate(), view.startDate().getYear() + "년 주간"),
                    new Summary(view.relationships().size(), view.averageScore(), view.averageChange()),
                    view.relationships().stream().map(DashboardResponse::card).toList(),
                    view.largestChanges().stream().map(item -> new LargestChange(
                            item.getId(), item.getName(), item.getLatestChange(), List.of(item.getLatestScore())
                    )).toList(),
                    view.needsAttention().stream().map(DashboardResponse::attention).toList()
            );
        }

        private static RelationshipCard card(Relationship relationship) {
            ScoreLabel label = label(relationship.getLatestScore());
            return new RelationshipCard(
                    relationship.getId(), relationship.getName(), relationship.getInitial(), relationship.getRelationshipType(),
                    relationship.getLatestScore(), label.code(), label.label(), relationship.getLatestChange(),
                    relationship.getLastAnalyzedAt() == null ? null : relationship.getLastAnalyzedAt().toString(),
                    List.of(relationship.getLatestScore())
            );
        }

        private static Attention attention(Relationship relationship) {
            boolean both = relationship.getLatestScore() < 60
                    && relationship.getLatestChange() != null && relationship.getLatestChange() <= -10;
            String code = both ? "SCORE_AND_DROP"
                    : relationship.getLatestScore() < 60 ? "LOW_SCORE" : "LARGE_DROP";
            return new Attention(relationship.getId(), relationship.getName(), relationship.getLatestScore(), code, "변화가 관찰됨");
        }

        private static ScoreLabel label(int score) {
            if (score >= 80) return new ScoreLabel("HEALTHY", "건강한 관계");
            if (score >= 60) return new ScoreLabel("GOOD", "양호");
            if (score >= 40) return new ScoreLabel("NEEDS_ATTENTION", "주의 필요");
            return new ScoreLabel("CHANGE_DETECTED", "변화 감지");
        }
    }

    record ScoreLabel(String code, String label) {}
}
