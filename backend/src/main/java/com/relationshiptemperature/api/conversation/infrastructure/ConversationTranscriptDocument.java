package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "conversation_transcripts")
public class ConversationTranscriptDocument {

    @Id
    private UUID id;
    private UUID userId;
    private UUID relationshipId;
    private String originalFileName;
    private String source;
    private String normalizedCsv;
    private List<MessageDocument> messages;
    private Instant createdAt;

    protected ConversationTranscriptDocument() {
    }

    private ConversationTranscriptDocument(
            UUID id,
            UUID userId,
            UUID relationshipId,
            String originalFileName,
            String normalizedCsv,
            List<MessageDocument> messages,
            Instant createdAt
    ) {
        this.id = id;
        this.userId = userId;
        this.relationshipId = relationshipId;
        this.originalFileName = originalFileName;
        this.source = "KAKAO_TALK";
        this.normalizedCsv = normalizedCsv;
        this.messages = messages;
        this.createdAt = createdAt;
    }

    static ConversationTranscriptDocument from(
            ConversationFile file,
            KakaoConversationParser.ParseResult parsed,
            Instant createdAt
    ) {
        return new ConversationTranscriptDocument(
                file.getId(),
                file.getUserId(),
                file.getRelationshipId(),
                file.getOriginalFileName(),
                parsed.normalizedCsv(),
                parsed.messages().stream().map(MessageDocument::from).toList(),
                createdAt
        );
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getRelationshipId() { return relationshipId; }
    public String getOriginalFileName() { return originalFileName; }
    public String getSource() { return source; }
    public String getNormalizedCsv() { return normalizedCsv; }
    public List<MessageDocument> getMessages() { return messages; }
    public Instant getCreatedAt() { return createdAt; }

    public record MessageDocument(String sender, String text, Instant sentAt) {
        static MessageDocument from(KakaoConversationParser.KakaoMessage message) {
            return new MessageDocument(message.sender(), message.text(), message.sentAt());
        }
    }
}
