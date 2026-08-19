package com.relationshiptemperature.api.conversation.application;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;

public interface KakaoConversationParser {

    ParseResult parse(InputStream inputStream) throws IOException;

    record KakaoMessage(String sender, String text, Instant sentAt) {}

    record ParseResult(
            int messageCount,
            Instant startedAt,
            Instant endedAt,
            List<KakaoMessage> messages,
            String normalizedCsv
    ) {}
}
