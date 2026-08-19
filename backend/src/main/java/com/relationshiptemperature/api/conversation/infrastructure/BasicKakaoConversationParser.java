package com.relationshiptemperature.api.conversation.infrastructure;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class BasicKakaoConversationParser implements KakaoConversationParser {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CSV_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern KAKAO_DATE = Pattern.compile("(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일.*");
    private static final Pattern KAKAO_MESSAGE = Pattern.compile("(오전|오후)\\s+(\\d{1,2}):(\\d{2})\\s+(\\S+)\\s+(.+)");

    @Override
    public ParseResult parse(InputStream inputStream) throws IOException {
        String content = decode(inputStream.readAllBytes());
        List<KakaoMessage> messages = isCsv(content) ? parseCsv(content) : parseTxt(content);
        if (messages.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        }
        return result(messages);
    }

    private String decode(byte[] bytes) {
        for (Charset charset : List.of(StandardCharsets.UTF_8, Charset.forName("MS949"))) {
            try {
                return charset.newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT)
                        .decode(ByteBuffer.wrap(bytes))
                        .toString()
                        .replace("\uFEFF", "");
            } catch (CharacterCodingException ignored) {
                // Try the next supported Korean export encoding.
            }
        }
        throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
    }

    private boolean isCsv(String content) {
        return content.lines()
                .filter(line -> !line.isBlank())
                .findFirst()
                .map(line -> line.trim().equals("Date,User,Message"))
                .orElse(false);
    }

    private List<KakaoMessage> parseCsv(String content) {
        List<String> lines = content.lines().filter(line -> !line.isBlank()).toList();
        if (lines.isEmpty() || !lines.getFirst().trim().equals("Date,User,Message")) {
            throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
        }
        List<KakaoMessage> messages = new ArrayList<>();
        for (int index = 1; index < lines.size(); index++) {
            List<String> fields = csvFields(lines.get(index));
            if (fields.size() != 3) {
                throw new ApiException(ErrorCode.INVALID_KAKAO_EXPORT);
            }
            LocalDateTime sentAt = LocalDateTime.parse(fields.get(0), CSV_DATE_TIME);
            messages.add(new KakaoMessage(
                    fields.get(1),
                    fields.get(2),
                    sentAt.atZone(KOREA).toInstant()
            ));
        }
        return messages;
    }

    private List<KakaoMessage> parseTxt(String content) {
        LocalDate currentDate = null;
        List<KakaoMessage> messages = new ArrayList<>();
        for (String rawLine : content.lines().toList()) {
            String line = rawLine.strip();
            if (line.isBlank()) {
                continue;
            }
            Matcher dateMatcher = KAKAO_DATE.matcher(line);
            if (dateMatcher.matches()) {
                currentDate = LocalDate.of(
                        Integer.parseInt(dateMatcher.group(1)),
                        Integer.parseInt(dateMatcher.group(2)),
                        Integer.parseInt(dateMatcher.group(3))
                );
                continue;
            }
            Matcher messageMatcher = KAKAO_MESSAGE.matcher(line);
            if (messageMatcher.matches() && currentDate != null) {
                int hour = Integer.parseInt(messageMatcher.group(2));
                if ("오후".equals(messageMatcher.group(1)) && hour < 12) {
                    hour += 12;
                }
                if ("오전".equals(messageMatcher.group(1)) && hour == 12) {
                    hour = 0;
                }
                LocalDateTime sentAt = LocalDateTime.of(
                        currentDate,
                        LocalTime.of(hour, Integer.parseInt(messageMatcher.group(3)))
                );
                messages.add(new KakaoMessage(
                        messageMatcher.group(4),
                        messageMatcher.group(5),
                        sentAt.atZone(KOREA).toInstant()
                ));
            }
        }
        return messages;
    }

    private ParseResult result(List<KakaoMessage> messages) {
        Instant startedAt = messages.getFirst().sentAt();
        Instant endedAt = messages.getLast().sentAt();
        return new ParseResult(messages.size(), startedAt, endedAt, List.copyOf(messages), normalizedCsv(messages));
    }

    private String normalizedCsv(List<KakaoMessage> messages) {
        StringBuilder builder = new StringBuilder("Date,User,Message\n");
        for (KakaoMessage message : messages) {
            builder.append(CSV_DATE_TIME.format(LocalDateTime.ofInstant(message.sentAt(), KOREA)))
                    .append(',')
                    .append(quote(message.sender()))
                    .append(',')
                    .append(quote(message.text()))
                    .append('\n');
        }
        return builder.toString();
    }

    private List<String> csvFields(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    field.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                fields.add(field.toString());
                field.setLength(0);
            } else {
                field.append(character);
            }
        }
        fields.add(field.toString());
        return fields;
    }

    private String quote(String value) {
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}
