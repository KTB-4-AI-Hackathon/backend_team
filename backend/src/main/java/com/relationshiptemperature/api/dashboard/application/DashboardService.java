package com.relationshiptemperature.api.dashboard.application;

import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.domain.RelationshipStatus;
import com.relationshiptemperature.api.relationship.repository.RelationshipRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final RelationshipRepository relationshipRepository;

    public DashboardService(RelationshipRepository relationshipRepository) {
        this.relationshipRepository = relationshipRepository;
    }

    public DashboardView get(UUID userId, LocalDate weekOf, Sort sort) {
        LocalDate day = weekOf == null ? LocalDate.now() : weekOf;
        LocalDate start = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate end = start.plusDays(6);
        List<Relationship> active = relationshipRepository.findAllByUserIdOrderByUpdatedAtDesc(userId).stream()
                .filter(item -> item.getStatus() == RelationshipStatus.ACTIVE)
                .sorted(sort.comparator())
                .toList();
        Integer average = active.isEmpty() ? null : (int) Math.round(active.stream()
                .mapToInt(Relationship::getLatestScore).average().orElse(0));
        Integer averageChange = active.stream().anyMatch(item -> item.getLatestChange() != null)
                ? (int) Math.round(active.stream().filter(item -> item.getLatestChange() != null)
                .mapToInt(Relationship::getLatestChange).average().orElse(0))
                : null;
        List<Relationship> largest = active.stream()
                .filter(item -> item.getLatestChange() != null)
                .sorted(Comparator.comparingInt(item -> -Math.abs(item.getLatestChange())))
                .limit(3)
                .toList();
        List<Relationship> attention = active.stream()
                .filter(item -> item.getLatestScore() < 60
                        || (item.getLatestChange() != null && item.getLatestChange() <= -10))
                .toList();
        return new DashboardView(start, end, active, average, averageChange, largest, attention);
    }

    public enum Sort {
        ABS_CHANGE_DESC,
        SCORE_DESC,
        SCORE_ASC,
        UPDATED_DESC;

        Comparator<Relationship> comparator() {
            return switch (this) {
                case ABS_CHANGE_DESC -> Comparator.comparingInt(
                        item -> item.getLatestChange() == null ? Integer.MAX_VALUE : -Math.abs(item.getLatestChange())
                );
                case SCORE_DESC -> Comparator.comparing(Relationship::getLatestScore).reversed();
                case SCORE_ASC -> Comparator.comparing(Relationship::getLatestScore);
                case UPDATED_DESC -> Comparator.comparing(Relationship::getUpdatedAt).reversed();
            };
        }
    }

    public record DashboardView(
            LocalDate startDate,
            LocalDate endDate,
            List<Relationship> relationships,
            Integer averageScore,
            Integer averageChange,
            List<Relationship> largestChanges,
            List<Relationship> needsAttention
    ) {}
}
