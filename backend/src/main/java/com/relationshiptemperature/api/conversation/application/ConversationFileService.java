package com.relationshiptemperature.api.conversation.application;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.config.AppProperties;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import com.relationshiptemperature.api.conversation.repository.ConversationFileRepository;
import com.relationshiptemperature.api.relationship.application.RelationshipService;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class ConversationFileService {

    private final AppProperties properties;
    private final ConversationStorage storage;
    private final KakaoConversationParser parser;
    private final ConversationFileRepository fileRepository;
    private final RelationshipService relationshipService;
    private final ConversationTranscriptStore transcriptStore;

    public ConversationFileService(
            AppProperties properties,
            ConversationStorage storage,
            KakaoConversationParser parser,
            ConversationFileRepository fileRepository,
            RelationshipService relationshipService,
            ConversationTranscriptStore transcriptStore
    ) {
        this.properties = properties;
        this.storage = storage;
        this.parser = parser;
        this.fileRepository = fileRepository;
        this.relationshipService = relationshipService;
        this.transcriptStore = transcriptStore;
    }

    @Transactional
    public ConversationFile upload(UUID userId, UUID relationshipId, MultipartFile multipartFile) {
        relationshipService.getOwned(userId, relationshipId);
        validate(multipartFile);
        String originalName = safeName(multipartFile.getOriginalFilename());

        try {
            ConversationStorage.StoredObject stored;
            try (InputStream input = multipartFile.getInputStream()) {
                stored = storage.save(input);
            }
            KakaoConversationParser.ParseResult parsed;
            try (InputStream input = storage.open(stored.storageKey())) {
                parsed = parser.parse(input);
            } catch (Exception exception) {
                storage.delete(stored.storageKey());
                throw exception;
            }

            ConversationFile file = new ConversationFile(
                    userId,
                    relationshipId,
                    originalName,
                    stored.storageKey(),
                    stored.sizeBytes(),
                    stored.sha256(),
                    Instant.now().plus(properties.retention().rawConversation())
            );
            file.validated(parsed.messageCount(), parsed.startedAt(), parsed.endedAt());
            ConversationFile saved = fileRepository.save(file);
            transcriptStore.save(saved, parsed);
            return saved;
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        }
    }

    public ConversationFile getOwned(UUID userId, UUID fileId) {
        return fileRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void delete(UUID userId, UUID fileId) {
        ConversationFile file = getOwned(userId, fileId);
        try {
            if (file.getStorageKey() != null) {
                storage.delete(file.getStorageKey());
            }
        } catch (IOException exception) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
        transcriptStore.delete(file.getId());
        fileRepository.delete(file);
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        }
        if (file.getSize() > properties.upload().maxBytes()) {
            throw new ApiException(ErrorCode.FILE_TOO_LARGE);
        }
        String extension = extension(safeName(file.getOriginalFilename()));
        if (!properties.upload().allowedExtensions().contains(extension)) {
            throw new ApiException(ErrorCode.UNSUPPORTED_FILE_TYPE);
        }
    }

    private String safeName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "conversation.txt";
        }
        return Path.of(originalName).getFileName().toString();
    }

    private String extension(String name) {
        int index = name.lastIndexOf('.');
        return index < 0 ? "" : name.substring(index + 1).toLowerCase(Locale.ROOT);
    }
}
