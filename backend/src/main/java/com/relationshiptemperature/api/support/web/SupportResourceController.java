package com.relationshiptemperature.api.support.web;

import com.relationshiptemperature.api.common.api.ApiResponse;
import com.relationshiptemperature.api.support.domain.SupportResource;
import com.relationshiptemperature.api.support.repository.SupportResourceRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/support-resources")
public class SupportResourceController {

    private final SupportResourceRepository repository;

    public SupportResourceController(SupportResourceRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    ApiResponse<List<SupportResourceResponse>> list(
            @RequestParam(defaultValue = "KR") String region,
            @RequestParam(defaultValue = "MENTAL_HEALTH_COUNSELING") String category
    ) {
        return ApiResponse.of(repository.findAllByRegionAndCategoryOrderByNameAsc(region, category).stream()
                .map(SupportResourceResponse::from)
                .toList());
    }

    record SupportResourceResponse(
            UUID id,
            String name,
            String description,
            String category,
            String region,
            String url,
            String phone,
            String hours,
            Instant verifiedAt,
            String source
    ) {
        static SupportResourceResponse from(SupportResource resource) {
            return new SupportResourceResponse(
                    resource.getId(), resource.getName(), resource.getDescription(), resource.getCategory(),
                    resource.getRegion(), resource.getUrl(), resource.getPhone(), resource.getHours(),
                    resource.getVerifiedAt(), resource.getSource()
            );
        }
    }
}
