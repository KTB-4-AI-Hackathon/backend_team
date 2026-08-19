package com.relationshiptemperature.api.conversation.application;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.config.AppProperties;
import com.relationshiptemperature.api.conversation.domain.ConversationFile;
import com.relationshiptemperature.api.conversation.domain.ConversationMessage;
import com.relationshiptemperature.api.conversation.infrastructure.ConversationParserRouter;
import com.relationshiptemperature.api.conversation.repository.ConversationFileRepository;
import com.relationshiptemperature.api.conversation.repository.ConversationMessageRepository;
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
    private final ConversationParserRouter parserRouter;
    private final ConversationFileRepository fileRepository;
    private final ConversationMessageRepository messageRepository;
    private final RelationshipService relationshipService;

    public ConversationFileService(
            AppProperties properties,
            ConversationStorage storage,
            ConversationParserRouter parserRouter,
            ConversationFileRepository fileRepository,
            ConversationMessageRepository messageRepository,
            RelationshipService relationshipService
    ) {
        this.properties = properties;
        this.storage = storage;
        this.parserRouter = parserRouter;
        this.fileRepository = fileRepository;
        this.messageRepository = messageRepository;
        this.relationshipService = relationshipService;
    }

    @Transactional
    public ConversationFile upload(
            UUID userId,
            UUID relationshipId,
            MultipartFile multipartFile,
            String selfParticipantName
    ) {
        relationshipService.getOwned(userId, relationshipId);
        validate(multipartFile, selfParticipantName);
        String originalName = safeName(multipartFile.getOriginalFilename());
        String extension = extension(originalName);

        ConversationStorage.StoredObject stored = null;
        try {
            try (InputStream input = multipartFile.getInputStream()) {
                stored = storage.save(input);
            }
            if (fileRepository.findByRelationshipIdAndSha256(relationshipId, stored.sha256()).isPresent()) {
                deleteStored(stored.storageKey());
                throw new ApiException(ErrorCode.DUPLICATE_CONVERSATION_FILE);
            }

            ParsedConversation parsed;
            try (InputStream input = storage.open(stored.storageKey())) {
                parsed = parserRouter.parse(extension, input, selfParticipantName);
            } catch (Exception exception) {
                deleteStored(stored.storageKey());
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
            file.participants(parsed.selfParticipantName(), parsed.otherParticipantName());
            file.validated(parsed.messages().size(), parsed.messages().getFirst().sentAt(), parsed.messages().getLast().sentAt());
            fileRepository.save(file);
            messageRepository.saveAll(parsed.messages().stream()
                    .map(message -> new ConversationMessage(
                            file.getId(), relationshipId, message.sequenceNumber(), message.sentAt(),
                            message.senderName(), message.role(), message.content()
                    ))
                    .toList());
            fileRepository.flush();
            return file;
        } catch (ApiException exception) {
            if (stored != null && exception.errorCode() != ErrorCode.DUPLICATE_CONVERSATION_FILE) {
                deleteStoredQuietly(stored.storageKey());
            }
            if (exception instanceof ConversationParseException parseException) {
                throw new ApiException(parseException.semanticCode());
            }
            throw exception;
        } catch (IOException exception) {
            if (stored != null) {
                deleteStoredQuietly(stored.storageKey());
            }
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        } catch (RuntimeException exception) {
            if (stored != null) {
                deleteStoredQuietly(stored.storageKey());
            }
            throw exception;
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
        messageRepository.deleteAllByConversationFileId(fileId);
        fileRepository.delete(file);
    }

    private void validate(MultipartFile file, String selfParticipantName) {
        if (selfParticipantName == null || selfParticipantName.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "selfParticipantName은 필수입니다.");
        }
        if (file == null || file.isEmpty()) {
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

    private void deleteStored(String storageKey) {
        try {
            storage.delete(storageKey);
        } catch (IOException exception) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private void deleteStoredQuietly(String storageKey) {
        try {
            storage.delete(storageKey);
        } catch (IOException ignored) {
            // Preserve the original upload/parse/persistence failure without exposing storage details.
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
