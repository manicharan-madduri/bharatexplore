package com.tourism.india.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "destination_rankings")
public class DestinationRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false, unique = true)
    private Destination destination;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    @Column(name = "reporting_year", nullable = false)
    private Integer reportingYear;

    @Column(name = "visitor_count")
    private Long visitorCount;

    @Column(name = "visitor_count_type", length = 50)
    private String visitorCountType; // DOMESTIC, FOREIGN, TOTAL, ESTIMATED

    @Column(name = "source_organization", length = 255)
    private String sourceOrganization;

    @Column(name = "source_title", length = 255)
    private String sourceTitle;

    @Column(name = "source_url", length = 512)
    private String sourceUrl;

    @Column(name = "publication_date")
    private LocalDate publicationDate;

    @Column(name = "last_verified_at")
    private LocalDate lastVerifiedAt;

    @Column(name = "verification_status", nullable = false, length = 50)
    private String verificationStatus; // VERIFIED, UNVERIFIED_POPULAR

    public DestinationRanking() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Destination getDestination() {
        return destination;
    }

    public void setDestination(Destination destination) {
        this.destination = destination;
    }

    public Integer getRankPosition() {
        return rankPosition;
    }

    public void setRankPosition(Integer rankPosition) {
        this.rankPosition = rankPosition;
    }

    public Integer getReportingYear() {
        return reportingYear;
    }

    public void setReportingYear(Integer reportingYear) {
        this.reportingYear = reportingYear;
    }

    public Long getVisitorCount() {
        return visitorCount;
    }

    public void setVisitorCount(Long visitorCount) {
        this.visitorCount = visitorCount;
    }

    public String getVisitorCountType() {
        return visitorCountType;
    }

    public void setVisitorCountType(String visitorCountType) {
        this.visitorCountType = visitorCountType;
    }

    public String getSourceOrganization() {
        return sourceOrganization;
    }

    public void setSourceOrganization(String sourceOrganization) {
        this.sourceOrganization = sourceOrganization;
    }

    public String getSourceTitle() {
        return sourceTitle;
    }

    public void setSourceTitle(String sourceTitle) {
        this.sourceTitle = sourceTitle;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public LocalDate getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(LocalDate publicationDate) {
        this.publicationDate = publicationDate;
    }

    public LocalDate getLastVerifiedAt() {
        return lastVerifiedAt;
    }

    public void setLastVerifiedAt(LocalDate lastVerifiedAt) {
        this.lastVerifiedAt = lastVerifiedAt;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }
}
