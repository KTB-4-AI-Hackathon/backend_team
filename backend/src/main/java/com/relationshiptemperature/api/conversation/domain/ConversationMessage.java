package com.relationshiptemperature.api.conversation.domain;

import com.relationshiptemperature.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "conversation_messages",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_conversation_message_file_sequence",
                columnNames = {"conversation_file_id", "sequence_number"}
        ),
        indexes = {
                @Index(name = "idx_conversation_message_file_sequence", columnList = "conversation_file_id,sequence_number"),
                @Index(name = "idx_conversation_message_relationship", columnList = "relationship_id")
        }
)
public class ConversationMessage extends BaseEntity {

    @Column(name = "conversation_file_id", nullable = false)
    private UUID conversationFileId;

    @Column(name = "relationship_id", nullable = false)
    private UUID relationshipId;

    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_role", nullable = false, length = 20)
    private ConversationParticipantRole participantRole;

    @Column(nullable = false, length = 20000)
    private String content;

    protected ConversationMessage() {
    }

    public ConversationMessage(
            UUID conversationFileId,
            UUID relationshipId,
            int sequenceNumber,
            Instant sentAt,
            String senderName,
            ConversationParticipantRole participantRole,
            String content
    ) {
        this.conversationFileId = Objects.requireNonNull(conversationFileId, "conversationFileId");
        this.relationshipId = Objects.requireNonNull(relationshipId, "relationshipId");
        if (sequenceNumber < 0) {
            throw new IllegalArgumentException("sequenceNumber must not be negative");
        }
        this.sequenceNumber = sequenceNumber;
        this.sentAt = Objects.requireNonNull(sentAt, "sentAt");
        this.senderName = requireNonBlank(senderName, "senderName");
        this.participantRole = Objects.requireNonNull(participantRole, "participantRole");
        this.content = requireNonBlank(content, "content");
    }

    private String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value;
    }

    public UUID getConversationFileId() { return conversationFileId; }
    public UUID getRelationshipId() { return relationshipId; }
    public int getSequenceNumber() { return sequenceNumber; }
    public Instant getSentAt() { return sentAt; }
    public String getSenderName() { return senderName; }
    public ConversationParticipantRole getParticipantRole() { return participantRole; }
    public String getContent() { return content; }
}
