package com.tourism.india.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DestinationDetailDTO extends DestinationDTO {
    private String fullDescription;
    private String estimatedVisitDuration;
    private String historicalSignificance;
    private String mainAttractions;
    private String travelTips;
    private String openingHours;
    private String entryFees;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private List<PhotoDTO> photos = new ArrayList<>();
    private RankingDTO rankingInfo;

    public DestinationDetailDTO() {}

    public String getFullDescription() {
        return fullDescription;
    }

    public void setFullDescription(String fullDescription) {
        this.fullDescription = fullDescription;
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

    public List<PhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<PhotoDTO> photos) {
        this.photos = photos;
    }

    public RankingDTO getRankingInfo() {
        return rankingInfo;
    }

    public void setRankingInfo(RankingDTO rankingInfo) {
        this.rankingInfo = rankingInfo;
    }
}
