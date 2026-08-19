package com.relationshiptemperature.api.checkin.application;

import com.relationshiptemperature.api.checkin.domain.CheckIn;
import com.relationshiptemperature.api.checkin.repository.CheckInRepository;
import com.relationshiptemperature.api.relationship.application.RelationshipService;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckInService {

    private final CheckInRepository checkInRepository;
    private final RelationshipService relationshipService;

    public CheckInService(CheckInRepository checkInRepository, RelationshipService relationshipService) {
        this.checkInRepository = checkInRepository;
        this.relationshipService = relationshipService;
    }

    @Transactional
    public CheckIn save(UUID userId, UUID relationshipId, int feeling, int comfort) {
        relationshipService.getOwned(userId, relationshipId);
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        CheckIn checkIn = checkInRepository.findByRelationshipIdAndWeekStart(relationshipId, weekStart)
                .map(existing -> {
                    existing.update(feeling, comfort);
                    return existing;
                })
                .orElseGet(() -> new CheckIn(userId, relationshipId, weekStart, feeling, comfort));
        return checkInRepository.save(checkIn);
    }
}
