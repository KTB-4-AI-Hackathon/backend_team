package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.conversation.application.ConversationTranscriptStore;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class MongoConversationTranscriptStore implements ConversationTranscriptStore {

    private final ConversationTranscriptMongoRepository repository;

    public MongoConversationTranscriptStore(ConversationTranscriptMongoRepository repository) {
        this.repository = repository;
    }

    @Override
    public void save(ConversationFile file, KakaoConversationParser.ParseResult parsed) {
        repository.save(ConversationTranscriptDocument.from(file, parsed, Instant.now()));
    }

    @Override
    public void delete(UUID conversationFileId) {
        repository.deleteById(conversationFileId);
    }
}
