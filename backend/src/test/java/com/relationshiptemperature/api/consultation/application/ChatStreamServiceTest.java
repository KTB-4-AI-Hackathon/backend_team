package com.relationshiptemperature.api.consultation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.relationshiptemperature.api.consultation.domain.ChatMessage;
import com.relationshiptemperature.api.consultation.domain.ChatMessage.EvidenceReference;
import com.relationshiptemperature.api.consultation.domain.ChatMessage.ResourceQuery;
import com.relationshiptemperature.api.consultation.domain.ChatMessage.SafetyNotice;
import com.relationshiptemperature.api.consultation.domain.Consultation;
import com.relationshiptemperature.api.consultation.domain.MessageStatus;
import com.relationshiptemperature.api.consultation.repository.ChatMessageRepository;
import com.relationshiptemperature.api.consultation.repository.ConsultationRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatStreamServiceTest {

    @Test
    void completesAndStoresStructuredAiAnswerInMongoDocuments() {
        ChatMessageRepository messageRepository = mock(ChatMessageRepository.class);
        ConsultationRepository consultationRepository = mock(ConsultationRepository.class);
        ChatAiClient aiClient = mock(ChatAiClient.class);
        ChatStreamService service = new ChatStreamService(messageRepository, consultationRepository, aiClient);

        Consultation consultation = new Consultation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        ChatMessage user = ChatMessage.user(consultation.getId(), "불안해요");
        ChatMessage assistant = ChatMessage.assistant(
                consultation.getId(), user.getId(), "", MessageStatus.GENERATING
        );
        SafetyNotice notice = new SafetyNotice(
                "SUPPORT_RECOMMENDATION", "마음을 돌보는 제안", "전문가와 이야기해 보세요.",
                new ResourceQuery("MENTAL_HEALTH_COUNSELING", "KR")
        );
        EvidenceReference reference = new EvidenceReference("evidence-1", "최근 응답 패턴");
        ChatAiClient.ChatContext context = new ChatAiClient.ChatContext(
                consultation.getReportId(), 70, 5,
                new ChatAiClient.PrqcContext(70, 70, 70, 70, 70, 70),
                List.of(new ChatAiClient.EvidenceContext(
                        "evidence-1", "trust", 70, "최근 응답 패턴"
                )),
                List.of(), user.getContent()
        );
        when(messageRepository.findById(assistant.getId())).thenReturn(Optional.of(assistant));
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(consultationRepository.findById(consultation.getId())).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(aiClient.answer(context)).thenReturn(new ChatAiClient.ChatAnswer(
                "리포트 근거를 바탕으로 함께 살펴볼게요.", List.of(reference), notice
        ));

        service.start(new ChatRequestedEvent(
                consultation.getId(), user.getId(), assistant.getId(), context
        ));

        assertThat(assistant.getStatus()).isEqualTo(MessageStatus.COMPLETED);
        assertThat(assistant.getContent()).contains("리포트 근거");
        assertThat(assistant.getEvidenceRefs()).containsExactly(reference);
        assertThat(assistant.getSafetyNotice()).isEqualTo(notice);
        assertThat(consultation.getLastMessagePreview()).contains("리포트 근거");
        verify(messageRepository).save(assistant);
        verify(consultationRepository).save(consultation);
    }
}
