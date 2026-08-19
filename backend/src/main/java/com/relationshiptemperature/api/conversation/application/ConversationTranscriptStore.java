package com.relationshiptemperature.api.conversation.application;

import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import java.util.UUID;

public interface ConversationTranscriptStore {

    void save(ConversationFile file, KakaoConversationParser.ParseResult parsed);

    void delete(UUID conversationFileId);
}
