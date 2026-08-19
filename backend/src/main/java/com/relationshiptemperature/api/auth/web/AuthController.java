package com.relationshiptemperature.api.auth.web;

import com.relationshiptemperature.api.auth.application.CurrentUserService;
import com.relationshiptemperature.api.auth.domain.User;
import com.relationshiptemperature.api.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final CurrentUserService currentUserService;

    public AuthController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/auth/kakao/authorize")
    ResponseEntity<Void> authorize(
            @RequestParam(required = false) String redirectUri,
            HttpServletRequest request
    ) {
        if (redirectUri != null && !redirectUri.isBlank()) {
            request.getSession(true).setAttribute("postLoginRedirectUri", redirectUri);
        }
        return ResponseEntity.status(302)
                .location(URI.create("/oauth2/authorization/kakao"))
                .build();
    }

    @GetMapping("/users/me")
    ApiResponse<CurrentUserResponse> me(CsrfToken csrfToken) {
        User user = currentUserService.requireUser();
        return ApiResponse.of(new CurrentUserResponse(
                user.getId(),
                user.getDisplayName(),
                user.getProfileImageUrl(),
                user.getTimezone(),
                csrfToken.getToken(),
                user.getCreatedAt()
        ));
    }

    record CurrentUserResponse(
            UUID id,
            String displayName,
            String profileImageUrl,
            String timezone,
            String csrfToken,
            Instant createdAt
    ) {}
}
