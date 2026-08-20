package com.relationshiptemperature.api.analysis.application;

import com.relationshiptemperature.api.auth.domain.User;
import com.relationshiptemperature.api.auth.repository.UserRepository;
import com.relationshiptemperature.api.analysis.domain.AnalysisJob;
import com.relationshiptemperature.api.analysis.domain.AnalysisStage;
import com.relationshiptemperature.api.analysis.repository.AnalysisJobRepository;
import com.relationshiptemperature.api.checkin.domain.CheckIn;
import com.relationshiptemperature.api.checkin.repository.CheckInAnswerRepository;
import com.relationshiptemperature.api.checkin.repository.CheckInRepository;
import com.relationshiptemperature.api.relationship.domain.Relationship;
import com.relationshiptemperature.api.relationship.repository.RelationshipRepository;
import com.relationshiptemperature.api.report.application.ReportService;
import com.relationshiptemperature.api.report.domain.RelationshipReport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClientResponseException;

@Component
public class AnalysisJobRunner {

    private static final Logger log = LoggerFactory.getLogger(AnalysisJobRunner.class);

    private final AnalysisJobRepository jobRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserRepository userRepository;
    private final CheckInRepository checkInRepository;
    private final CheckInAnswerRepository checkInAnswerRepository;
    private final AiAnalysisClient aiAnalysisClient;
    private final ReportService reportService;

    public AnalysisJobRunner(
            AnalysisJobRepository jobRepository,
            RelationshipRepository relationshipRepository,
            UserRepository userRepository,
            CheckInRepository checkInRepository,
            CheckInAnswerRepository checkInAnswerRepository,
            AiAnalysisClient aiAnalysisClient,
            ReportService reportService
    ) {
        this.jobRepository = jobRepository;
        this.relationshipRepository = relationshipRepository;
        this.userRepository = userRepository;
        this.checkInRepository = checkInRepository;
        this.checkInAnswerRepository = checkInAnswerRepository;
        this.aiAnalysisClient = aiAnalysisClient;
        this.reportService = reportService;
    }

    @Async("analysisExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void run(AnalysisRequestedEvent event) {
        AnalysisJob job = jobRepository.findById(event.jobId()).orElseThrow();
        Relationship relationship = relationshipRepository.findById(job.getRelationshipId()).orElseThrow();
        User user = userRepository.findById(job.getUserId()).orElseThrow();
        CheckIn checkIn = checkInRepository.findById(job.getCheckInId()).orElseThrow();
        try {
            update(job, AnalysisStage.LOADING_CONVERSATION, 10);
            update(job, AnalysisStage.ANALYZING_MESSAGE_PATTERNS, 30);
            update(job, AnalysisStage.ANALYZING_EMOTIONAL_FLOW, 60);
            AiAnalysisClient.AnalysisResult result = analyzeWithRetry(new AiAnalysisClient.AnalysisRequest(
                    job.getId(),
                    job.getConversationFileId(),
                    relationship.getRelationshipType(),
                    new AiAnalysisClient.AnalysisContext(
                            new AiAnalysisClient.UserContext(
                                    user.getId(), user.getDisplayName(), user.getTimezone()
                            ),
                            new AiAnalysisClient.RelationshipContext(
                                    relationship.getId(),
                                    relationship.getName(),
                                    relationship.getRelationshipType(),
                                    relationship.getStatus().name()
                            ),
                            new AiAnalysisClient.CheckInContext(
                                    checkIn.getId(),
                                    checkIn.getWeekStart(),
                                    checkInAnswerRepository.findAllByCheckInIdIn(java.util.List.of(checkIn.getId()))
                                            .stream()
                                            .map(answer -> new AiAnalysisClient.CheckInAnswerContext(
                                                    answer.getQuestionCode().name(), answer.getScore()
                                            ))
                                            .toList()
                            )
                    )
            ));
            update(job, AnalysisStage.CALCULATING_PRQC, 80);
            update(job, AnalysisStage.CALCULATING_RELATIONSHIP_SCORE, 95);
            RelationshipReport report = reportService.create(
                    job.getId(), job.getCheckInId(), relationship, result
            );
            job.complete(report.getId());
            jobRepository.save(job);
        } catch (Exception exception) {
            log.error("Analysis failed jobId={}", job.getId(), exception);
            job.fail("ANALYSIS_UNAVAILABLE", "일시적으로 분석할 수 없어요. 잠시 후 다시 시도해 주세요.", true);
            relationship.failAnalysis();
            jobRepository.save(job);
            relationshipRepository.save(relationship);
        }
    }

    private void update(AnalysisJob job, AnalysisStage stage, int progress) {
        job.progress(stage, progress);
        jobRepository.save(job);
    }

    private AiAnalysisClient.AnalysisResult analyzeWithRetry(AiAnalysisClient.AnalysisRequest request) {
        long[] delays = {0L, 2_000L, 5_000L};
        for (int attempt = 0; attempt < delays.length; attempt++) {
            try {
                if (delays[attempt] > 0) {
                    Thread.sleep(delays[attempt]);
                }
                return aiAnalysisClient.analyze(request);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Analysis retry interrupted", exception);
            } catch (RestClientResponseException exception) {
                int status = exception.getStatusCode().value();
                boolean retryable = status == 429 || status == 503 || status == 504;
                if (!retryable || attempt == delays.length - 1) {
                    throw exception;
                }
            }
        }
        throw new IllegalStateException("Unreachable analysis retry state");
    }
}
