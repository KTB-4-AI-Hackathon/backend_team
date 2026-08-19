package com.relationshiptemperature.api.conversation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.relationshiptemperature.api.config.AppProperties;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import com.relationshiptemperature.api.conversation.repository.ConversationFileRepository;
import com.relationshiptemperature.api.relationship.application.RelationshipService;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ConversationFileServiceTest {

    private final ConversationStorage storage = mock(ConversationStorage.class);
    private final KakaoConversationParser parser = mock(KakaoConversationParser.class);
    private final ConversationFileRepository fileRepository = mock(ConversationFileRepository.class);
    private final RelationshipService relationshipService = mock(RelationshipService.class);
    private final ConversationTranscriptStore transcriptStore = mock(ConversationTranscriptStore.class);
    private final ConversationFileService service = new ConversationFileService(
            properties(), storage, parser, fileRepository, relationshipService, transcriptStore
    );

    @Test
    void uploadsCsvAndStoresNormalizedTranscript() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID relationshipId = UUID.randomUUID();
        String normalizedCsv = """
                Date,User,Message
                2026-08-19 19:23:28,"이진우","ㅎㅇ여"
                """;
        var parsed = new KakaoConversationParser.ParseResult(
                1,
                Instant.parse("2026-08-19T10:23:28Z"),
                Instant.parse("2026-08-19T10:23:28Z"),
                List.of(new KakaoConversationParser.KakaoMessage(
                        "이진우",
                        "ㅎㅇ여",
                        Instant.parse("2026-08-19T10:23:28Z")
                )),
                normalizedCsv
        );
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "KakaoTalk_Chat.csv",
                "text/csv",
                normalizedCsv.getBytes()
        );
        ConversationStorage.StoredObject stored = new ConversationStorage.StoredObject("stored.csv", 64, "a".repeat(64));
        when(storage.save(any(InputStream.class))).thenReturn(stored);
        when(storage.open("stored.csv")).thenReturn(new ByteArrayInputStream(normalizedCsv.getBytes()));
        when(parser.parse(any(InputStream.class))).thenReturn(parsed);
        when(fileRepository.save(any(ConversationFile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConversationFile uploaded = service.upload(userId, relationshipId, file);

        assertThat(uploaded.getOriginalFileName()).isEqualTo("KakaoTalk_Chat.csv");
        assertThat(uploaded.getMessageCount()).isEqualTo(1);
        verify(transcriptStore).save(uploaded, parsed);
    }

    private AppProperties properties() {
        return new AppProperties(
                "http://localhost:5173",
                new AppProperties.Storage(Path.of("./build/test-uploads")),
                new AppProperties.Ai("stub", "http://localhost:8000", "test-token", Duration.ofSeconds(5)),
                new AppProperties.Upload(50 * 1024 * 1024, Set.of("txt", "csv")),
                new AppProperties.Retention(Duration.ofHours(24))
        );
    }
}
