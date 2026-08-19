package com.relationshiptemperature.api.consultation.infrastructure;

import com.relationshiptemperature.api.consultation.application.ChatAiClient;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class StubChatAiClient implements ChatAiClient {

    @Override
    public ChatAnswer answer(UUID reportId, String userMessage) {
        return new ChatAnswer(
                "그 마음을 알아차린 것만으로도 중요한 시작일 수 있어요. 어떤 순간에 가장 크게 느껴지는지 함께 살펴볼까요?",
                null,
                null
        );
    }
}
