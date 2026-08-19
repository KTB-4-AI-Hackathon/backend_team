package com.relationshiptemperature.api.consultation.application;

import java.util.UUID;

public interface ChatAiClient {

    ChatAnswer answer(UUID reportId, String userMessage);

    record ChatAnswer(String content, String safetyNoticeType, String safetyNoticeMessage) {}
}
