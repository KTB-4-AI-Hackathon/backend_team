package com.relationshiptemperature.api.checkin.web;

import com.relationshiptemperature.api.auth.application.CurrentUserService;
import com.relationshiptemperature.api.checkin.application.CheckInService;
import com.relationshiptemperature.api.checkin.domain.CheckIn;
import com.relationshiptemperature.api.common.api.ApiResponse;
import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/relationships/{relationshipId}/check-ins")
public class CheckInController {

    private final CurrentUserService currentUserService;
    private final CheckInService checkInService;

    public CheckInController(CurrentUserService currentUserService, CheckInService checkInService) {
        this.currentUserService = currentUserService;
        this.checkInService = checkInService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<CheckInResponse> create(
            @PathVariable UUID relationshipId,
            @Valid @RequestBody CreateCheckInRequest request
    ) {
        Map<QuestionCode, Answer> answers = request.answers().stream()
                .collect(Collectors.toMap(Answer::questionCode, Function.identity(), (left, right) -> right));
        Answer feeling = answers.get(QuestionCode.RELATIONSHIP_FEELING);
        Answer comfort = answers.get(QuestionCode.CONVERSATION_COMFORT);
        if (feeling == null || comfort == null) {
            throw new ApiException(ErrorCode.CHECK_IN_INCOMPLETE);
        }
        CheckIn checkIn = checkInService.save(
                currentUserService.requireUserId(),
                relationshipId,
                feeling.score(),
                comfort.score()
        );
        return ApiResponse.of(CheckInResponse.from(checkIn));
    }

    public enum QuestionCode {
        RELATIONSHIP_FEELING,
        CONVERSATION_COMFORT
    }

    public record Answer(QuestionCode questionCode, @Min(1) @Max(7) int score) {}

    public record CreateCheckInRequest(@NotEmpty List<@Valid Answer> answers) {}

    public record CheckInResponse(
            UUID id,
            UUID relationshipId,
            List<Answer> answers,
            LocalDate weekStart,
            Instant createdAt
    ) {
        static CheckInResponse from(CheckIn checkIn) {
            return new CheckInResponse(
                    checkIn.getId(),
                    checkIn.getRelationshipId(),
                    List.of(
                            new Answer(QuestionCode.RELATIONSHIP_FEELING, checkIn.getRelationshipFeeling()),
                            new Answer(QuestionCode.CONVERSATION_COMFORT, checkIn.getConversationComfort())
                    ),
                    checkIn.getWeekStart(),
                    checkIn.getCreatedAt()
            );
        }
    }
}
