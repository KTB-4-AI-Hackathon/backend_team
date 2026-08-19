package com.relationshiptemperature.api.report.domain;

import com.relationshiptemperature.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "relationship_reports", indexes = {
        @Index(name = "idx_report_relationship_analyzed", columnList = "relationship_id,analyzed_at")
})
public class RelationshipReport extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "relationship_id", nullable = false)
    private UUID relationshipId;

    @Column(name = "analysis_job_id", nullable = false, unique = true)
    private UUID analysisJobId;

    @Column(name = "overall_score", nullable = false)
    private int overallScore;

    @Column(name = "score_change")
    private Integer scoreChange;

    @Column(nullable = false)
    private int satisfaction;

    @Column(nullable = false)
    private int commitment;

    @Column(nullable = false)
    private int intimacy;

    @Column(nullable = false)
    private int trust;

    @Column(nullable = false)
    private int passion;

    @Column(nullable = false)
    private int love;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "scoring_policy_version", nullable = false, length = 100)
    private String scoringPolicyVersion;

    @Column(name = "analyzed_at", nullable = false)
    private Instant analyzedAt;

    protected RelationshipReport() {
    }

    public RelationshipReport(
            UUID userId,
            UUID relationshipId,
            UUID analysisJobId,
            int overallScore,
            Integer scoreChange,
            PrqcScores scores,
            String modelVersion,
            String scoringPolicyVersion,
            Instant analyzedAt
    ) {
        this.userId = userId;
        this.relationshipId = relationshipId;
        this.analysisJobId = analysisJobId;
        this.overallScore = overallScore;
        this.scoreChange = scoreChange;
        this.satisfaction = scores.satisfaction();
        this.commitment = scores.commitment();
        this.intimacy = scores.intimacy();
        this.trust = scores.trust();
        this.passion = scores.passion();
        this.love = scores.love();
        this.modelVersion = modelVersion;
        this.scoringPolicyVersion = scoringPolicyVersion;
        this.analyzedAt = analyzedAt;
    }

    public UUID getUserId() { return userId; }
    public UUID getRelationshipId() { return relationshipId; }
    public UUID getAnalysisJobId() { return analysisJobId; }
    public int getOverallScore() { return overallScore; }
    public Integer getScoreChange() { return scoreChange; }
    public PrqcScores getPrqcScores() {
        return new PrqcScores(satisfaction, commitment, intimacy, trust, passion, love);
    }
    public String getModelVersion() { return modelVersion; }
    public String getScoringPolicyVersion() { return scoringPolicyVersion; }
    public Instant getAnalyzedAt() { return analyzedAt; }

    public record PrqcScores(int satisfaction, int commitment, int intimacy, int trust, int passion, int love) {}
}
