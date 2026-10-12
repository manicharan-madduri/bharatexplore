package com.tourism.india.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "destinations")
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "state_id", nullable = false)
    private State state;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @Column(name = "state_slug", length = 100)
    private String stateSlug;

    @Column(name = "city_or_district", nullable = false, length = 100)
    private String cityOrDistrict;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "full_description", columnDefinition = "TEXT")
    private String fullDescription;

    @Column(nullable = false, length = 50)
    private String category; // Historical, Religious, Nature, Wildlife, Beach, Adventure, Cultural, Monument

    @Column(name = "cover_image_url", length = 512)
    private String coverImageUrl;

    @Column(name = "best_time_to_visit", length = 100)
    private String bestTimeToVisit;

    @Column(name = "estimated_visit_duration", length = 50)
    private String estimatedVisitDuration;

    @Column(name = "historical_significance", columnDefinition = "TEXT")
    private String historicalSignificance;

    @Column(name = "main_attractions", columnDefinition = "TEXT")
    private String mainAttractions;

    @Column(name = "travel_tips", columnDefinition = "TEXT")
    private String travelTips;

    @Column(name = "opening_hours", length = 100)
    private String openingHours;

    @Column(name = "entry_fees", length = 200)
    private String entryFees;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @OneToMany(mappedBy = "destination", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DestinationPhoto> photos = new ArrayList<>();

    @OneToOne(mappedBy = "destination", cascade = CascadeType.ALL, orphanRemoval = true)
    private DestinationRanking ranking;

    public Destination() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getStateSlug() {
        return stateSlug;
    }

    public void setStateSlug(String stateSlug) {
        this.stateSlug = stateSlug;
    }

    public String getCityOrDistrict() {
        return cityOrDistrict;
    }

    public void setCityOrDistrict(String cityOrDistrict) {
        this.cityOrDistrict = cityOrDistrict;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getFullDescription() {
        return fullDescription;
    }

    public void setFullDescription(String fullDescription) {
        this.fullDescription = fullDescription;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCoverImageUrl() {
        return coverImageUrl;
    }

    public void setCoverImageUrl(String coverImageUrl) {
        this.coverImageUrl = coverImageUrl;
    }

    public String getBestTimeToVisit() {
        return bestTimeToVisit;
    }

    public void setBestTimeToVisit(String bestTimeToVisit) {
        this.bestTimeToVisit = bestTimeToVisit;
    }

    public String getEstimatedVisitDuration() {
        return estimatedVisitDuration;
    }

    public void setEstimatedVisitDuration(String estimatedVisitDuration) {
        this.estimatedVisitDuration = estimatedVisitDuration;
    }

    public String getHistoricalSignificance() {
        return historicalSignificance;
    }

    public void setHistoricalSignificance(String historicalSignificance) {
        this.historicalSignificance = historicalSignificance;
    }

    public String getMainAttractions() {
        return mainAttractions;
    }

    public void setMainAttractions(String mainAttractions) {
        this.mainAttractions = mainAttractions;
    }

    public String getTravelTips() {
        return travelTips;
    }

    public void setTravelTips(String travelTips) {
        this.travelTips = travelTips;
    }

    public String getOpeningHours() {
        return openingHours;
    }

    public void setOpeningHours(String openingHours) {
        this.openingHours = openingHours;
    }

    public String getEntryFees() {
        return entryFees;
    }

    public void setEntryFees(String entryFees) {
        this.entryFees = entryFees;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public List<DestinationPhoto> getPhotos() {
        return photos;
    }

    public void setPhotos(List<DestinationPhoto> photos) {
        this.photos = photos;
    }

    public DestinationRanking getRanking() {
        return ranking;
    }

    public void setRanking(DestinationRanking ranking) {
        this.ranking = ranking;
    }
}
