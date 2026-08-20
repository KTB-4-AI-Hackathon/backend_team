package com.relationshiptemperature.api.analysis.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class AnalysisContextSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesUserRelationshipAndAllCheckInAnswersForAi() throws Exception {
        AiAnalysisClient.AnalysisContext context = new AiAnalysisClient.AnalysisContext(
                new AiAnalysisClient.UserContext(UUID.randomUUID(), "우", "Asia/Seoul"),
                new AiAnalysisClient.RelationshipContext(
                        UUID.randomUUID(), "민지", RelationshipType.FRIEND, "ANALYZING"
                ),
                new AiAnalysisClient.CheckInContext(
                        UUID.randomUUID(),
                        LocalDate.of(2026, 8, 17),
                        List.of(
                                new AiAnalysisClient.CheckInAnswerContext("RELATIONSHIP_FEELING", 6),
                                new AiAnalysisClient.CheckInAnswerContext("CONVERSATION_COMFORT", 4)
                        )
                )
        );

        String json = objectMapper.writeValueAsString(context);

        assertThat(json)
                .contains("\"displayName\":\"우\"")
                .contains("\"relationshipType\":\"FRIEND\"")
                .contains("\"weekStart\":\"2026-08-17\"")
                .contains("\"questionCode\":\"RELATIONSHIP_FEELING\"")
                .contains("\"score\":6")
                .contains("\"questionCode\":\"CONVERSATION_COMFORT\"")
                .contains("\"score\":4");
    }
}
