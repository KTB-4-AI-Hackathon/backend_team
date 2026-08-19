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

class BasicKakaoConversationParserTest {

    private final BasicKakaoConversationParser parser = new BasicKakaoConversationParser();

    @Test
    void parsesDatedKakaoTxtMessagesAndPreservesContinuationLines() throws Exception {
        String content = """
                2026년 8월 19일 수요일
                오후 7:23 강명진 사진 txt파일은 이거야
                두 번째 줄도 같은 메시지야
                오후 7:24 이진우 확인했어
                """;

        var parsed = parser.parse(input(content), "  강명진  ");

        assertThat(parsed.selfParticipantName()).isEqualTo("강명진");
        assertThat(parsed.otherParticipantName()).isEqualTo("이진우");
        assertThat(parsed.messages()).extracting(
                message -> message.sequenceNumber(),
                message -> message.sentAt(),
                message -> message.senderName(),
                message -> message.role(),
                message -> message.content()
        ).containsExactly(
                org.assertj.core.groups.Tuple.tuple(
                        0, Instant.parse("2026-08-19T10:23:00Z"), "강명진",
                        ConversationParticipantRole.SELF, "사진 txt파일은 이거야\n두 번째 줄도 같은 메시지야"
                ),
                org.assertj.core.groups.Tuple.tuple(
                        1, Instant.parse("2026-08-19T10:24:00Z"), "이진우",
                        ConversationParticipantRole.OTHER, "확인했어"
                )
        );
    }

    @Test
    void preservesContinuationLineBeginningWithKoreanMeridiem() throws Exception {
        String content = """
                2026년 8월 19일 수요일
                오후 7:23 강명진 첫 줄
                오후 이 문장은 새 메시지 헤더가 아니야
                오후 7:24 이진우 확인했어
                """;

        var parsed = parser.parse(input(content), "강명진");

        assertThat(parsed.messages().getFirst().content())
                .isEqualTo("첫 줄\n오후 이 문장은 새 메시지 헤더가 아니야");
    }

    @Test
    void preservesContentLeadingWhitespaceAfterTheSenderDelimiter() throws Exception {
        String content = """
                2026년 8월 19일 수요일
                오후 7:23 강명진  첫 글자 앞 공백
                오후 7:24 이진우 확인했어
                """;

        var parsed = parser.parse(input(content), "강명진");

        assertThat(parsed.messages().getFirst().content()).isEqualTo(" 첫 글자 앞 공백");
    }

    @Test
    void rejectsTxtConversationWhenSelfParticipantIsAbsent() {
        assertInvalid("""
                2026년 8월 19일 수요일
                오후 7:23 강명진 안녕
                오후 7:24 이진우 반가워
                """, "박서준");
    }

    @Test
    void rejectsTxtGroupConversation() {
        assertInvalid("""
                2026년 8월 19일 수요일
                오후 7:23 강명진 안녕
                오후 7:24 이진우 반가워
                오후 7:25 박서준 같이 보자
                """, "강명진");
    }

    @Test
    void rejectsTxtWithInvalidDateHeading() {
        assertInvalid("""
                2026년 2월 30일 월요일
                오후 7:23 강명진 안녕
                오후 7:24 이진우 반가워
                """, "강명진");
    }

    @Test
    void rejectsTxtMessageWithEmptyContent() {
        assertInvalid("""
                2026년 8월 19일 수요일
                오후 7:23 강명진
                오후 7:24 이진우 반가워
                """, "강명진");
    }

    private ByteArrayInputStream input(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }

    private void assertInvalid(String content, String selfParticipantName) {
        assertThatThrownBy(() -> parser.parse(input(content), selfParticipantName))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).errorCode())
                .isEqualTo(ErrorCode.INVALID_KAKAO_EXPORT);
    }
}
