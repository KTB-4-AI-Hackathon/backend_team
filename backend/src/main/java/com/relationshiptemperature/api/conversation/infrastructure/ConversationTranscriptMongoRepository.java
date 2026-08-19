package com.relationshiptemperature.api.conversation.infrastructure;

import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConversationTranscriptMongoRepository extends MongoRepository<ConversationTranscriptDocument, UUID> {
}
