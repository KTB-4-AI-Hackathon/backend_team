package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class BasicKakaoConversationParser implements KakaoConversationParser {

    @Override
    public ParseResult parse(InputStream inputStream) throws IOException {
        int nonBlankLines = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) {
                    nonBlankLines++;
                }
            }
        }
        if (nonBlankLines < 3) {
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        }

        // TODO(ai-upload): 실제 카카오 내보내기 포맷별 날짜/발신자/메시지 파서를 구현한다.
        return new ParseResult(nonBlankLines, null, null);
    }
}
