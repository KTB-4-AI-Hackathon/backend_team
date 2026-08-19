package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.conversation.application.ParsedConversation;
import com.relationshiptemperature.api.conversation.domain.ConversationParticipantRole;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackInputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

@Component
public class KakaoCsvConversationParser implements KakaoConversationParser {

    private static final ZoneId KAKAO_EXPORT_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
            .ofPattern("uuuu-MM-dd HH:mm:ss")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final CSVFormat CSV_FORMAT = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .get();

    @Override
    public ParsedConversation parse(InputStream inputStream, String selfParticipantName) throws IOException {
        try {
            String self = normalizedName(selfParticipantName);
            List<RawMessage> rawMessages = new ArrayList<>();
            try (
                    Reader reader = new InputStreamReader(stripUtf8Bom(inputStream), StandardCharsets.UTF_8);
                    CSVParser csv = CSVParser.parse(reader, CSV_FORMAT)
            ) {
                validateHeader(csv.getHeaderMap());
                for (CSVRecord record : csv) {
                    rawMessages.add(new RawMessage(
                            parseSentAt(record.get("Date")),
                            normalizedName(record.get("User")),
                            requireContent(record.get("Message"))
                    ));
                }
            }
            return parsedConversation(rawMessages, self);
        } catch (ApiException exception) {
            throw exception;
        } catch (DateTimeException | IllegalArgumentException exception) {
            throw invalidExport();
        }
    }

    private InputStream stripUtf8Bom(InputStream inputStream) throws IOException {
        PushbackInputStream stream = new PushbackInputStream(new BufferedInputStream(inputStream), 3);
        byte[] bytes = stream.readNBytes(3);
        if (bytes.length == 3 && bytes[0] == (byte) 0xEF && bytes[1] == (byte) 0xBB && bytes[2] == (byte) 0xBF) {
            return stream;
        }
        stream.unread(bytes);
        return stream;
    }

    private void validateHeader(Map<String, Integer> headerMap) {
        if (!headerMap.keySet().containsAll(List.of("Date", "User", "Message"))) {
            throw invalidExport();
        }
    }

    private Instant parseSentAt(String value) {
        return LocalDateTime.parse(value, DATE_FORMAT).atZone(KAKAO_EXPORT_ZONE).toInstant();
    }

    private String requireContent(String value) {
        if (value == null || value.isBlank()) {
            throw invalidExport();
        }
        return value;
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
                .orElseThrow(KakaoCsvConversationParser::invalidExport);
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
}
