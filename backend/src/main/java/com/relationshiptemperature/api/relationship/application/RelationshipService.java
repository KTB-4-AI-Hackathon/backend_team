package com.relationshiptemperature.api.relationship.application;

import com.relationshiptemperature.api.common.error.ApiException;
import com.relationshiptemperature.api.common.error.ErrorCode;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.domain.RelationshipType;
import com.relationshiptemperature.api.relationship.repository.RelationshipRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RelationshipService {

    private final RelationshipRepository relationshipRepository;

    public RelationshipService(RelationshipRepository relationshipRepository) {
        this.relationshipRepository = relationshipRepository;
    }

    @Transactional
    public Relationship create(UUID userId, String name, RelationshipType type) {
        return relationshipRepository.save(Relationship.draft(userId, name.trim(), type));
    }

    public List<Relationship> list(UUID userId, String search) {
        if (search == null || search.isBlank()) {
            return relationshipRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        }
        return relationshipRepository.findAllByUserIdAndNameContainingIgnoreCaseOrderByUpdatedAtDesc(
                userId,
                search.trim()
        );
    }

    public Relationship getOwned(UUID userId, UUID relationshipId) {
        return relationshipRepository.findByIdAndUserId(relationshipId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RELATIONSHIP_NOT_FOUND));
    }

    @Transactional
    public Relationship update(UUID userId, UUID relationshipId, String name, RelationshipType type) {
        Relationship relationship = getOwned(userId, relationshipId);
        relationship.update(name == null ? null : name.trim(), type);
        return relationship;
    }

    @Transactional
    public void delete(UUID userId, UUID relationshipId) {
        Relationship relationship = getOwned(userId, relationshipId);
        relationship.markDeleting();
        relationshipRepository.delete(relationship);
    }
}
