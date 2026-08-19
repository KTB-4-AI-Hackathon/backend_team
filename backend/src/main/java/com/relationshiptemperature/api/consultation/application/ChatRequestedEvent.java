package com.relationshiptemperature.api.consultation.application;

import java.util.UUID;

public record ChatRequestedEvent(UUID consultationId, UUID reportId, UUID userMessageId, UUID assistantMessageId) {
}
