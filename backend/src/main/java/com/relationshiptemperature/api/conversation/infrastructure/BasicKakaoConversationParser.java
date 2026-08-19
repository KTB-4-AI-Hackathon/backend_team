package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.conversation.application.ParsedConversation;
import com.relationshiptemperature.api.conversation.domain.ConversationParticipantRole;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class BasicKakaoConversationParser implements KakaoConversationParser {

    private static final ZoneId KAKAO_EXPORT_ZONE = ZoneId.of("Asia/Seoul");
    private static final Pattern DATE_HEADING = Pattern.compile(
            "^(\\d{4})년\\s+(\\d{1,2})월\\s+(\\d{1,2})일\\s+(\\S+)$"
    );
    private static final Pattern MESSAGE = Pattern.compile(
            "^(오전|오후)\\s+(\\d{1,2}):(\\d{2})\\s+(\\S+)\\s(.*)$"
    );

    @Override
    public ParsedConversation parse(InputStream inputStream, String selfParticipantName) throws IOException {
        try {
            String self = normalizedName(selfParticipantName);
            List<RawMessage> rawMessages = new ArrayList<>();
            LocalDate date = null;
            PendingMessage pending = null;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    Matcher dateMatcher = DATE_HEADING.matcher(line);
                    if (dateMatcher.matches()) {
                        addPending(rawMessages, pending);
                        pending = null;
                        date = parseDateHeading(dateMatcher);
                        continue;
                    }
                    if (line.startsWith("20") && line.contains("년")) {
                        throw invalidExport();
                    }

                    Matcher messageMatcher = MESSAGE.matcher(line);
                    if (messageMatcher.matches()) {
                        if (date == null) {
                            throw invalidExport();
                        }
                        addPending(rawMessages, pending);
                        pending = new PendingMessage(
                                parseSentAt(date, messageMatcher),
                                normalizedName(messageMatcher.group(4)),
                                new StringBuilder(messageMatcher.group(5))
                        );
                        continue;
                    }
                    if (pending == null) {
                        if (!line.isBlank()) {
                            throw invalidExport();
                        }
                        continue;
                    }
                    pending.content().append('\n').append(line);
                }
            }
            addPending(rawMessages, pending);
            return parsedConversation(rawMessages, self);
        } catch (ApiException exception) {
            throw exception;
        } catch (DateTimeException | IllegalArgumentException exception) {
            throw invalidExport();
        }
    }

    private LocalDate parseDateHeading(Matcher matcher) {
        LocalDate date = LocalDate.of(
                Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2)), Integer.parseInt(matcher.group(3))
        );
        String expectedDay = date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN);
        if (!expectedDay.equals(matcher.group(4))) {
            throw invalidExport();
        }
        return date;
    }

    private Instant parseSentAt(LocalDate date, Matcher matcher) {
        int hour = Integer.parseInt(matcher.group(2));
        int minute = Integer.parseInt(matcher.group(3));
        if (hour < 1 || hour > 12 || minute > 59) {
            throw invalidExport();
        }
        if ("오전".equals(matcher.group(1))) {
            hour = hour == 12 ? 0 : hour;
        } else {
            hour = hour == 12 ? 12 : hour + 12;
        }
        return LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), hour, minute)
                .atZone(KAKAO_EXPORT_ZONE)
                .toInstant();
    }

    private void addPending(List<RawMessage> messages, PendingMessage pending) {
        if (pending == null) {
            return;
        }
        String content = pending.content().toString();
        if (content.isBlank()) {
            throw invalidExport();
        }
        messages.add(new RawMessage(pending.sentAt(), pending.senderName(), content));
    }

    private ParsedConversation parsedConversation(List<RawMessage> rawMessages, String selfParticipantName) {
        Set<String> participants = new LinkedHashSet<>();
        for (RawMessage message : rawMessages) {
            participants.add(message.senderName());
        }
        if (participants.size() != 2 || !participants.contains(selfParticipantName)) {
            throw invalidExport();
        }
        String otherParticipantName = participants.stream()
                .filter(name -> !name.equals(selfParticipantName))
                .findFirst()
                .orElseThrow(BasicKakaoConversationParser::invalidExport);
        List<ParsedConversation.ParsedMessage> messages = new ArrayList<>();
        for (int sequenceNumber = 0; sequenceNumber < rawMessages.size(); sequenceNumber++) {
            RawMessage message = rawMessages.get(sequenceNumber);
            ConversationParticipantRole role = message.senderName().equals(selfParticipantName)
                    ? ConversationParticipantRole.SELF
                    : ConversationParticipantRole.OTHER;
            messages.add(new ParsedConversation.ParsedMessage(
                    sequenceNumber, message.sentAt(), message.senderName(), role, message.content()
            ));
        }
        return new ParsedConversation(messages, selfParticipantName, otherParticipantName);
    }

    private static String normalizedName(String value) {
        if (value == null || value.isBlank()) {
            throw invalidExport();
        }
        return value.trim();
    }

    private static ApiException invalidExport() {
        return new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
    }

    private record RawMessage(Instant sentAt, String senderName, String content) {}

    private record PendingMessage(Instant sentAt, String senderName, StringBuilder content) {}
}
