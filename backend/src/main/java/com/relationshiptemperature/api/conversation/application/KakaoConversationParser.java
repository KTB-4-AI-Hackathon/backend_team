package com.relationshiptemperature.api.conversation.application;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;

public interface KakaoConversationParser {

    ParseResult parse(InputStream inputStream) throws IOException;

    record ParseResult(int messageCount, Instant startedAt, Instant endedAt) {}
}
