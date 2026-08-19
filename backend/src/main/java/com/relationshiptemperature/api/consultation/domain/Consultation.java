package com.relationshiptemperature.api.consultation.domain;

import com.relationshiptemperature.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consultations", indexes = @Index(name = "idx_consultation_user_updated", columnList = "user_id,updated_at"))
public class Consultation extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "relationship_id", nullable = false)
    private UUID relationshipId;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "last_message_preview", length = 160)
    private String lastMessagePreview;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    protected Consultation() {
    }

    public Consultation(UUID userId, UUID relationshipId, UUID reportId) {
        this.userId = userId;
        this.relationshipId = relationshipId;
        this.reportId = reportId;
    }

    public void updatePreview(String content, Instant time) {
        this.lastMessagePreview = content.length() <= 160 ? content : content.substring(0, 160);
        this.lastMessageAt = time;
    }

    public UUID getUserId() { return userId; }
    public UUID getRelationshipId() { return relationshipId; }
    public UUID getReportId() { return reportId; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public Instant getLastMessageAt() { return lastMessageAt; }
}
