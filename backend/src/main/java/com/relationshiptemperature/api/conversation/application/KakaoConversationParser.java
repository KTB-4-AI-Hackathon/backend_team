package com.relationshiptemperature.api.conversation.application;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;

public interface KakaoConversationParser {

    ParsedConversation parse(InputStream inputStream, String selfParticipantName) throws IOException;

    default ParseResult parse(InputStream inputStream) throws IOException {
        throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
    }

    record ParseResult(int messageCount, Instant startedAt, Instant endedAt) {}
}
