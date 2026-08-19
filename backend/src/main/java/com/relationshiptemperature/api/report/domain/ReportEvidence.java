package com.relationshiptemperature.api.report.domain;

import com.relationshiptemperature.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "report_evidences", indexes = @Index(name = "idx_evidence_report", columnList = "report_id"))
public class ReportEvidence extends BaseEntity {

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(nullable = false, length = 30)
    private String component;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(name = "metric_name", length = 100)
    private String metricName;

    @Column(name = "current_value")
    private Double currentValue;

    @Column(name = "previous_value")
    private Double previousValue;

    @Column(name = "metric_unit", length = 30)
    private String metricUnit;

    @Column(name = "metric_period", length = 100)
    private String metricPeriod;

    protected ReportEvidence() {
    }

    public ReportEvidence(UUID reportId, String component, int score, String summary, Metric metric) {
        this.reportId = reportId;
        this.component = component;
        this.score = score;
        this.summary = summary;
        if (metric != null) {
            this.metricName = metric.name();
            this.currentValue = metric.currentValue();
            this.previousValue = metric.previousValue();
            this.metricUnit = metric.unit();
            this.metricPeriod = metric.period();
        }
    }

    public UUID getReportId() { return reportId; }
    public String getComponent() { return component; }
    public int getScore() { return score; }
    public String getSummary() { return summary; }
    public Metric getMetric() {
        return metricName == null ? null : new Metric(metricName, currentValue, previousValue, metricUnit, metricPeriod);
    }

    public record Metric(String name, Double currentValue, Double previousValue, String unit, String period) {}
}
