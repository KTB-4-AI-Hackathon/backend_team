package com.relationshiptemperature.api.analysis.application;

import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.report.domain.RelationshipReport.PrqcScores;
import com.relationshiptemperature.api.report.domain.ReportEvidence.Metric;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AiAnalysisClient {

    AnalysisResult analyze(AnalysisRequest request);

    record AnalysisRequest(
            UUID analysisId,
            UUID conversationFileId,
            RelationshipType relationshipType,
            AnalysisContext context
    ) {}

    /**
     * AI 분석에 필요한 최소한의 사용자·관계·체크인 맥락이다.
     * 카카오 식별자, OAuth 토큰, 프로필 이미지 URL 등 인증·불필요 개인정보는 포함하지 않는다.
     */
    record AnalysisContext(
            UserContext user,
            RelationshipContext relationship,
            CheckInContext checkIn
    ) {}

    record UserContext(UUID userId, String displayName, String timezone) {}

    record RelationshipContext(
            UUID relationshipId,
            String name,
            RelationshipType relationshipType,
            String status
    ) {}

    record CheckInContext(UUID checkInId, LocalDate weekStart, List<CheckInAnswerContext> answers) {}

    record CheckInAnswerContext(String questionCode, int score) {}

    record AnalysisResult(
            String modelVersion,
            String promptVersion,
            int processedMessageCount,
            PrqcScores components,
            List<EvidenceResult> evidences
    ) {}

    record EvidenceResult(String component, int score, String summary, Metric metric) {}
}
