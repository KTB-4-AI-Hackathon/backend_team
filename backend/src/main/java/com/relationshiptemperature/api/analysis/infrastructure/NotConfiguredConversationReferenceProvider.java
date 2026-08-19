package com.relationshiptemperature.api.analysis.infrastructure;

import com.relationshiptemperature.api.analysis.application.ConversationReferenceProvider;
import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.ai.mode", havingValue = "http")
public class NotConfiguredConversationReferenceProvider implements ConversationReferenceProvider {

    @Override
    public ConversationReference create(UUID conversationFileId) {
        // TODO(ai-adapter): S3/호환 Object Storage Presigned URL 발급 구현으로 교체한다.
        throw new ApiException(ErrorCode.ANALYSIS_UNAVAILABLE, "AI 대화 파일 참조 공급자가 설정되지 않았습니다.");
    }
}
