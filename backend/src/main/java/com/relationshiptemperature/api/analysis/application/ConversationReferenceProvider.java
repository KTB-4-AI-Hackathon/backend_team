package com.relationshiptemperature.api.analysis.application;

import java.util.UUID;

public interface ConversationReferenceProvider {

    ConversationReference create(UUID conversationFileId);

    record ConversationReference(
            String url,
            String format,
            String formatVersion,
            String contentEncoding,
            long sizeBytes,
            String sha256
    ) {}
}
