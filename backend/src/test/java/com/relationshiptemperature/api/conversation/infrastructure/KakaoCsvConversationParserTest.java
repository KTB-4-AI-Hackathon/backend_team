package com.relationshiptemperature.api.conversation.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.conversation.domain.ConversationParticipantRole;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class KakaoCsvConversationParserTest {

    private final KakaoCsvConversationParser parser = new KakaoCsvConversationParser();

    @Test
    void parsesBomCsvWithQuotedFieldsAndEmbeddedNewlines() throws Exception {
        String content = """
                \uFEFFDate,User,Message
                2026-08-19 19:23:00,강명진,\"안녕, 이진우\"
                2026-08-19 19:24:01,이진우,\"그가 말했어 \"\"고마워\"\"\"
                2026-08-19 19:25:02,강명진,\"첫 줄
                둘째 줄"
                2026-08-19 19:26:03,이진우,다음 주에 보자
                2026-08-19 19:27:04,강명진,좋아
                2026-08-19 19:28:05,이진우,응
                """;

        var parsed = parser.parse(input(content), " 강명진 ");

        assertThat(parsed.selfParticipantName()).isEqualTo("강명진");
        assertThat(parsed.otherParticipantName()).isEqualTo("이진우");
        assertThat(parsed.messages()).extracting(
                message -> message.sequenceNumber(),
                message -> message.sentAt(),
                message -> message.senderName(),
                message -> message.role(),
                message -> message.content()
        ).containsExactly(
                org.assertj.core.groups.Tuple.tuple(0, Instant.parse("2026-08-19T10:23:00Z"), "강명진", ConversationParticipantRole.SELF, "안녕, 이진우"),
                org.assertj.core.groups.Tuple.tuple(1, Instant.parse("2026-08-19T10:24:01Z"), "이진우", ConversationParticipantRole.OTHER, "그가 말했어 \"고마워\""),
                org.assertj.core.groups.Tuple.tuple(2, Instant.parse("2026-08-19T10:25:02Z"), "강명진", ConversationParticipantRole.SELF, "첫 줄\n둘째 줄"),
                org.assertj.core.groups.Tuple.tuple(3, Instant.parse("2026-08-19T10:26:03Z"), "이진우", ConversationParticipantRole.OTHER, "다음 주에 보자"),
                org.assertj.core.groups.Tuple.tuple(4, Instant.parse("2026-08-19T10:27:04Z"), "강명진", ConversationParticipantRole.SELF, "좋아"),
                org.assertj.core.groups.Tuple.tuple(5, Instant.parse("2026-08-19T10:28:05Z"), "이진우", ConversationParticipantRole.OTHER, "응")
        );
    }

    @Test
    void rejectsCsvRowsWithEmptyMessageContent() {
        String content = """
                Date,User,Message
                2026-08-19 19:23:00,강명진,안녕
                2026-08-19 19:24:00,이진우,\"\"
                """;

        assertThatThrownBy(() -> parser.parse(input(content), "강명진"))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).errorCode())
                .isEqualTo(ErrorCode.INVALID_KAKAO_EXPORT);
    }

    @Test
    void routesCsvInputByExtension() throws Exception {
        ConversationParserRouter router = new ConversationParserRouter(
                new KakaoCsvConversationParser(), new BasicKakaoConversationParser()
        );
        String content = """
                Date,User,Message
                2026-08-19 19:23:00,강명진,안녕
                2026-08-19 19:24:00,이진우,반가워
                """;

        var parsed = router.parse("CSV", input(content), "강명진");

        assertThat(parsed.messages()).hasSize(2);
        assertThat(parsed.messages().getFirst().role()).isEqualTo(ConversationParticipantRole.SELF);
    }

    private ByteArrayInputStream input(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }
}
