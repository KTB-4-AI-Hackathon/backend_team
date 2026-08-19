package com.relationshiptemperature.api.conversation.repository;

import com.relationshiptemperature.api.conversation.domain.ConversationMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, UUID> {

    List<ConversationMessage> findAllByConversationFileIdOrderBySequenceNumberAsc(UUID fileId);
}
