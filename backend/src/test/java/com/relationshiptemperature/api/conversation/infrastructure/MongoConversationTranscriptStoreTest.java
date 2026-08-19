package com.relationshiptemperature.api.conversation.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MongoConversationTranscriptStoreTest {

    private final ConversationTranscriptMongoRepository repository = mock(ConversationTranscriptMongoRepository.class);
    private final MongoConversationTranscriptStore store = new MongoConversationTranscriptStore(repository);

    @Test
    void storesNormalizedCsvAndMessagesByConversationFileId() {
        UUID userId = UUID.randomUUID();
        UUID relationshipId = UUID.randomUUID();
        ConversationFile file = new ConversationFile(
                userId,
                relationshipId,
                "KakaoTalk_Chat.csv",
                "raw.csv",
                123,
                "b".repeat(64),
                Instant.parse("2026-08-20T00:00:00Z")
        );
        KakaoConversationParser.ParseResult parsed = new KakaoConversationParser.ParseResult(
                1,
                Instant.parse("2026-08-19T10:23:28Z"),
                Instant.parse("2026-08-19T10:23:28Z"),
                List.of(new KakaoConversationParser.KakaoMessage(
                        "이진우",
                        "ㅎㅇ여",
                        Instant.parse("2026-08-19T10:23:28Z")
                )),
                "Date,User,Message\n2026-08-19 19:23:28,\"이진우\",\"ㅎㅇ여\"\n"
        );

        store.save(file, parsed);

        ArgumentCaptor<ConversationTranscriptDocument> captor =
                ArgumentCaptor.forClass(ConversationTranscriptDocument.class);
        verify(repository).save(captor.capture());
        ConversationTranscriptDocument document = captor.getValue();
        assertThat(document.getId()).isEqualTo(file.getId());
        assertThat(document.getUserId()).isEqualTo(userId);
        assertThat(document.getRelationshipId()).isEqualTo(relationshipId);
        assertThat(document.getNormalizedCsv()).isEqualTo(parsed.normalizedCsv());
        assertThat(document.getMessages()).singleElement()
                .satisfies(message -> {
                    assertThat(message.sender()).isEqualTo("이진우");
                    assertThat(message.text()).isEqualTo("ㅎㅇ여");
                    assertThat(message.sentAt()).isEqualTo(Instant.parse("2026-08-19T10:23:28Z"));
                });
    }

    @Test
    void deletesTranscriptByConversationFileId() {
        UUID fileId = UUID.randomUUID();

        store.delete(fileId);

        verify(repository).deleteById(fileId);
    }
}
