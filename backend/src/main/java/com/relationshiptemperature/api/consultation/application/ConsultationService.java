package com.relationshiptemperature.api.consultation.application;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.consultation.domain.ChatMessage;
import com.relationshiptemperature.api.consultation.domain.Consultation;
import com.relationshiptemperature.api.consultation.domain.MessageStatus;
import com.relationshiptemperature.api.consultation.repository.ChatMessageRepository;
import com.relationshiptemperature.api.consultation.repository.ConsultationRepository;
import com.relationshiptemperature.api.relationship.application.RelationshipService;
import com.relationshiptemperature.api.report.application.ReportService;
import com.relationshiptemperature.api.report.domain.RelationshipReport;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final ChatMessageRepository messageRepository;
    private final RelationshipService relationshipService;
    private final ReportService reportService;
    private final ApplicationEventPublisher eventPublisher;

    public ConsultationService(
            ConsultationRepository consultationRepository,
            ChatMessageRepository messageRepository,
            RelationshipService relationshipService,
            ReportService reportService,
            ApplicationEventPublisher eventPublisher
    ) {
        this.consultationRepository = consultationRepository;
        this.messageRepository = messageRepository;
        this.relationshipService = relationshipService;
        this.reportService = reportService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Consultation create(UUID userId, UUID relationshipId) {
        relationshipService.getOwned(userId, relationshipId);
        RelationshipReport report = reportService.latest(userId, relationshipId);
        Consultation consultation = consultationRepository.save(new Consultation(userId, relationshipId, report.getId()));
        ChatMessage initial = messageRepository.save(ChatMessage.assistant(
                consultation.getId(),
                "새로운 상담을 시작했어요. 지금 가장 이야기하고 싶은 관계의 순간을 들려주세요.",
                MessageStatus.COMPLETED
        ));
        consultation.updatePreview(initial.getContent(), Instant.now());
        return consultation;
    }

    public List<Consultation> list(UUID userId) {
        return consultationRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Consultation getOwned(UUID userId, UUID consultationId) {
        return consultationRepository.findByIdAndUserId(consultationId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    public List<ChatMessage> messages(UUID userId, UUID consultationId) {
        getOwned(userId, consultationId);
        return messageRepository.findAllByConsultationIdOrderByCreatedAtAsc(consultationId);
    }

    @Transactional
    public AcceptedMessage send(UUID userId, UUID consultationId, String content) {
        Consultation consultation = getOwned(userId, consultationId);
        ChatMessage userMessage = messageRepository.save(ChatMessage.user(consultationId, content.trim()));
        ChatMessage assistant = messageRepository.save(ChatMessage.assistant(
                consultationId, "", MessageStatus.GENERATING
        ));
        consultation.updatePreview(content.trim(), Instant.now());
        eventPublisher.publishEvent(new ChatRequestedEvent(
                consultationId, consultation.getReportId(), userMessage.getId(), assistant.getId()
        ));
        return new AcceptedMessage(userMessage, assistant);
    }

    @Transactional
    public void delete(UUID userId, UUID consultationId) {
        Consultation consultation = getOwned(userId, consultationId);
        messageRepository.deleteAll(messageRepository.findAllByConsultationIdOrderByCreatedAtAsc(consultationId));
        consultationRepository.delete(consultation);
    }

    public record AcceptedMessage(ChatMessage userMessage, ChatMessage assistantMessage) {}
}
