package com.relationshiptemperature.api.consultation.application;

import com.relationshiptemperature.api.consultation.domain.ChatMessage;
import com.relationshiptemperature.api.consultation.repository.ChatMessageRepository;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class ChatStreamService {

    private static final Logger log = LoggerFactory.getLogger(ChatStreamService.class);
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final ChatMessageRepository messageRepository;
    private final ChatAiClient chatAiClient;

    public ChatStreamService(ChatMessageRepository messageRepository, ChatAiClient chatAiClient) {
        this.messageRepository = messageRepository;
        this.chatAiClient = chatAiClient;
    }

    public SseEmitter subscribe(UUID consultationId) {
        SseEmitter emitter = new SseEmitter(60_000L);
        emitters.put(consultationId, emitter);
        emitter.onCompletion(() -> emitters.remove(consultationId, emitter));
        emitter.onTimeout(() -> emitters.remove(consultationId, emitter));
        emitter.onError(error -> emitters.remove(consultationId, emitter));
        return emitter;
    }

    @Async("chatExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void answer(ChatRequestedEvent event) {
        ChatMessage userMessage = messageRepository.findById(event.userMessageId()).orElseThrow();
        ChatMessage assistant = messageRepository.findById(event.assistantMessageId()).orElseThrow();
        try {
            ChatAiClient.ChatAnswer answer = chatAiClient.answer(event.reportId(), userMessage.getContent());
            send(event.consultationId(), "assistant.delta", Map.of(
                    "messageId", assistant.getId(),
                    "delta", answer.content()
            ));
            assistant.complete(answer.content(), answer.safetyNoticeType(), answer.safetyNoticeMessage());
            messageRepository.save(assistant);
            send(event.consultationId(), "assistant.completed", Map.of("messageId", assistant.getId()));
            complete(event.consultationId());
        } catch (Exception exception) {
            log.error("Chat generation failed assistantMessageId={}", assistant.getId(), exception);
            assistant.fail();
            messageRepository.save(assistant);
            send(event.consultationId(), "assistant.failed", Map.of("messageId", assistant.getId()));
            complete(event.consultationId());
        }
    }

    private void send(UUID consultationId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(consultationId);
        if (emitter == null) return;
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException exception) {
            emitters.remove(consultationId, emitter);
        }
    }

    private void complete(UUID consultationId) {
        SseEmitter emitter = emitters.remove(consultationId);
        if (emitter != null) emitter.complete();
    }
}
