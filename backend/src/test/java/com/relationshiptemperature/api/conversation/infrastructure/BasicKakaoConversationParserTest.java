package com.relationshiptemperature.api.conversation.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class BasicKakaoConversationParserTest {

    private final BasicKakaoConversationParser parser = new BasicKakaoConversationParser();

    @Test
    void parsesKakaoCsvAndNormalizesToCsvForAi() throws Exception {
        String content = """
                Date,User,Message
                2026-08-19 19:23:28,"이진우","ㅎㅇ여"
                2026-08-19 19:23:37,"강명진","ㅎㅇ여"
                2026-08-19 19:23:53,"이진우","저한테 왜 그러셨어요"
                """;

        var result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        assertThat(result.messageCount()).isEqualTo(3);
        assertThat(result.startedAt()).isEqualTo(Instant.parse("2026-08-19T10:23:28Z"));
        assertThat(result.endedAt()).isEqualTo(Instant.parse("2026-08-19T10:23:53Z"));
        assertThat(result.messages())
                .extracting("sender", "text")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("이진우", "ㅎㅇ여"),
                        org.assertj.core.groups.Tuple.tuple("강명진", "ㅎㅇ여"),
                        org.assertj.core.groups.Tuple.tuple("이진우", "저한테 왜 그러셨어요")
                );
        assertThat(result.normalizedCsv()).isEqualTo("""
                Date,User,Message
                2026-08-19 19:23:28,"이진우","ㅎㅇ여"
                2026-08-19 19:23:37,"강명진","ㅎㅇ여"
                2026-08-19 19:23:53,"이진우","저한테 왜 그러셨어요"
                """);
    }

    @Test
    void parsesKakaoTxtExportAndNormalizesToCsvForAi() throws Exception {
        String content = """
                2026년 8월 19일 수요일
                오후 7:23 이진우 ㅎㅇ여
                오후 7:23 강명진 ㅎㅇ여
                오후 7:24 이진우 사과해요 나한테
                """;

        var result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        assertThat(result.messageCount()).isEqualTo(3);
        assertThat(result.startedAt()).isEqualTo(Instant.parse("2026-08-19T10:23:00Z"));
        assertThat(result.endedAt()).isEqualTo(Instant.parse("2026-08-19T10:24:00Z"));
        assertThat(result.normalizedCsv()).isEqualTo("""
                Date,User,Message
                2026-08-19 19:23:00,"이진우","ㅎㅇ여"
                2026-08-19 19:23:00,"강명진","ㅎㅇ여"
                2026-08-19 19:24:00,"이진우","사과해요 나한테"
                """);
    }
}
