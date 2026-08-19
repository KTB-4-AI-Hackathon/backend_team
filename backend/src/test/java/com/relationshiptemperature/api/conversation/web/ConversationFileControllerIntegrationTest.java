package com.relationshiptemperature.api.conversation.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.relationshiptemperature.api.auth.application.AppOAuth2User;
import com.relationshiptemperature.api.auth.domain.User;
import com.relationshiptemperature.api.auth.repository.UserRepository;
import com.relationshiptemperature.api.conversation.application.ConversationTranscriptStore;
import com.relationshiptemperature.api.conversation.application.KakaoConversationParser;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.relationship.repository.RelationshipRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mock.web.MockMultipartFile;

@Transactional
@SpringBootTest
@AutoConfigureMockMvc
class ConversationFileControllerIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RelationshipRepository relationshipRepository;

    @Test
    void uploadsKakaoCsvAndReturnsParsedMetadata() throws Exception {
        User user = userRepository.save(User.kakao("kakao-upload-csv", "업로드", null));
        Relationship relationship = relationshipRepository.save(
                Relationship.draft(user.getId(), "강명진", RelationshipType.FRIEND)
        );
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "KakaoTalk_Chat.csv",
                "text/csv",
                """
                        Date,User,Message
                        2026-08-19 19:23:28,"이진우","ㅎㅇ여"
                        2026-08-19 19:24:34,"강명진","사진"
                        """.getBytes()
        );

        mockMvc.perform(multipart("/api/v1/relationships/{relationshipId}/conversation-files", relationship.getId())
                        .file(file)
                        .param("source", "KAKAO_TALK")
                        .with(authentication(oauthAuthentication(user)))
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.originalFileName").value("KakaoTalk_Chat.csv"))
                .andExpect(jsonPath("$.data.validationStatus").value("VALID"))
                .andExpect(jsonPath("$.data.messageCount").value(2))
                .andExpect(jsonPath("$.data.conversationStartedAt").value("2026-08-19T10:23:28Z"))
                .andExpect(jsonPath("$.data.conversationEndedAt").value("2026-08-19T10:24:34Z"));
    }

    private OAuth2AuthenticationToken oauthAuthentication(User user) {
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        var principal = new AppOAuth2User(user.getId(), user.getKakaoSubject(), Map.of(), authorities);
        return new OAuth2AuthenticationToken(principal, authorities, "kakao");
    }

    @TestConfiguration
    static class NoMongoTranscriptStoreConfig {
        @Bean
        @Primary
        ConversationTranscriptStore noMongoTranscriptStore() {
            return new ConversationTranscriptStore() {
                @Override
                public void save(
                        com.relationshiptemperature.api.conversation.domain.ConversationFile file,
                        KakaoConversationParser.ParseResult parsed
                ) {
                }

                @Override
                public void delete(java.util.UUID conversationFileId) {
                }
            };
        }
    }
}
