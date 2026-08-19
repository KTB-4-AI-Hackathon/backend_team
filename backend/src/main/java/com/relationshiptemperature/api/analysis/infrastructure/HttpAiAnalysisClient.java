package com.relationshiptemperature.api.analysis.infrastructure;

import com.relationshiptemperature.api.analysis.application.AiAnalysisClient;
import com.relationshiptemperature.api.analysis.application.ConversationReferenceProvider;
import com.relationshiptemperature.api.analysis.application.ConversationReferenceProvider.ConversationReference;
import com.relationshiptemperature.api.config.AppProperties;
import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.report.domain.RelationshipReport.PrqcScores;
import com.relationshiptemperature.api.report.domain.ReportEvidence.Metric;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name = "app.ai.mode", havingValue = "http")
public class HttpAiAnalysisClient implements AiAnalysisClient {

    private final RestClient restClient;
    private final ConversationReferenceProvider referenceProvider;

    public HttpAiAnalysisClient(
            RestClient.Builder builder,
            AppProperties properties,
            ConversationReferenceProvider referenceProvider
    ) {
        this.restClient = builder
                .baseUrl(properties.ai().baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.ai().serviceToken())
                .build();
        this.referenceProvider = referenceProvider;
    }

    @Override
    public AnalysisResult analyze(AnalysisRequest request) {
        ConversationReference reference = referenceProvider.create(request.conversationFileId());
        InternalResponse response = restClient.post()
                .uri("/internal/v1/prqc-analyses")
                .header("X-Request-Id", requestId())
                .header("Idempotency-Key", request.analysisId().toString())
                .body(new InternalRequest(request.analysisId(), request.relationshipType(), reference))
                .retrieve()
                .body(InternalResponse.class);
        if (response == null) {
            throw new IllegalStateException("AI server returned an empty response");
        }
        return new AnalysisResult(
                response.modelVersion(), response.promptVersion(), response.processedMessageCount(),
                response.components().toDomain(),
                response.evidences().stream().map(EvidenceDto::toDomain).toList()
        );
    }

    private String requestId() {
        String value = MDC.get("requestId");
        return value == null ? "analysis-worker-" + UUID.randomUUID() : value;
    }

    record InternalRequest(UUID analysisId, RelationshipType relationshipType, ConversationReference conversation) {}
    record ComponentsDto(int satisfaction, int commitment, int intimacy, int trust, int passion, int love) {
        PrqcScores toDomain() {
            return new PrqcScores(satisfaction, commitment, intimacy, trust, passion, love);
        }
    }
    record MetricDto(String name, Double currentValue, Double previousValue, String unit, String period) {
        Metric toDomain() {
            return new Metric(name, currentValue, previousValue, unit, period);
        }
    }
    record EvidenceDto(String component, int score, String summary, MetricDto metric) {
        EvidenceResult toDomain() {
            return new EvidenceResult(component, score, summary, metric == null ? null : metric.toDomain());
        }
    }
    record InternalResponse(
            UUID analysisId,
            String modelVersion,
            String promptVersion,
            int processedMessageCount,
            ComponentsDto components,
            List<EvidenceDto> evidences,
            List<Object> warnings,
            Instant completedAt
    ) {}
}
