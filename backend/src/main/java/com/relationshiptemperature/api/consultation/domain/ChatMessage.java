package com.relationshiptemperature.api.consultation.domain;

import com.relationshiptemperature.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = @Index(name = "idx_message_consultation_created", columnList = "consultation_id,created_at"))
public class ChatMessage extends BaseEntity {

    @Column(name = "consultation_id", nullable = false)
    private UUID consultationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRole role;

    @Column(nullable = false, length = 20000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageStatus status;

    @Column(name = "safety_notice_type", length = 50)
    private String safetyNoticeType;

    @Column(name = "safety_notice_message", length = 1000)
    private String safetyNoticeMessage;

    protected ChatMessage() {
    }

    public static ChatMessage user(UUID consultationId, String content) {
        return new ChatMessage(consultationId, ChatRole.USER, content, MessageStatus.COMPLETED);
    }

    public static ChatMessage assistant(UUID consultationId, String content, MessageStatus status) {
        return new ChatMessage(consultationId, ChatRole.ASSISTANT, content, status);
    }

    private ChatMessage(UUID consultationId, ChatRole role, String content, MessageStatus status) {
        this.consultationId = consultationId;
        this.role = role;
        this.content = content;
        this.status = status;
    }

    public void complete(String content, String noticeType, String noticeMessage) {
        this.content = content;
        this.status = MessageStatus.COMPLETED;
        this.safetyNoticeType = noticeType;
        this.safetyNoticeMessage = noticeMessage;
    }

    public void fail() {
        this.status = MessageStatus.FAILED;
    }

    public UUID getConsultationId() { return consultationId; }
    public ChatRole getRole() { return role; }
    public String getContent() { return content; }
    public MessageStatus getStatus() { return status; }
    public String getSafetyNoticeType() { return safetyNoticeType; }
    public String getSafetyNoticeMessage() { return safetyNoticeMessage; }
}
