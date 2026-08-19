package com.relationshiptemperature.api.conversation.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class BasicKakaoConversationParserTest {

    private final BasicKakaoConversationParser parser = new BasicKakaoConversationParser();

    @Test
    void countsNonBlankLinesUntilRealParserIsImplemented() throws Exception {
        String content = "카카오톡 대화\n\n메시지 1\n메시지 2\n";

        var result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        assertThat(result.messageCount()).isEqualTo(3);
    }
}
