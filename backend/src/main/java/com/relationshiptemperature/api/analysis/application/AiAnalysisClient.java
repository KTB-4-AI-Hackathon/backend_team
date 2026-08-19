package com.relationshiptemperature.api.analysis.application;

import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.report.domain.RelationshipReport.PrqcScores;
import com.relationshiptemperature.api.report.domain.ReportEvidence.Metric;
import java.util.List;
import java.util.UUID;

public interface AiAnalysisClient {

    AnalysisResult analyze(AnalysisRequest request);

    record AnalysisRequest(
            UUID analysisId,
            UUID conversationFileId,
            RelationshipType relationshipType
    ) {}

    record AnalysisResult(
            String modelVersion,
            String promptVersion,
            int processedMessageCount,
            PrqcScores components,
            List<EvidenceResult> evidences
    ) {}

    record EvidenceResult(String component, int score, String summary, Metric metric) {}
}
