package com.tourism.india.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "states")
public class State {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "administrative_type", nullable = false, length = 50)
    private String administrativeType; // STATE or UNION_TERRITORY

    @Column(nullable = false, length = 50)
    private String region; // Northern, Southern, Eastern, Western, Central, North-Eastern, Islands

    @Column(nullable = false, length = 100)
    private String capital;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "full_description", columnDefinition = "TEXT")
    private String fullDescription;

    @Column(name = "cover_image_url", length = 512)
    private String coverImageUrl;

    @Column(name = "best_time_to_visit", length = 100)
    private String bestTimeToVisit;

    @OneToMany(mappedBy = "state", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Destination> destinations = new ArrayList<>();

    public State() {}

    public State(String name, String slug, String administrativeType, String region, String capital,
                 String shortDescription, String fullDescription, String coverImageUrl, String bestTimeToVisit) {
        this.name = name;
        this.slug = slug;
        this.administrativeType = administrativeType;
        this.region = region;
        this.capital = capital;
        this.shortDescription = shortDescription;
        this.fullDescription = fullDescription;
        this.coverImageUrl = coverImageUrl;
        this.bestTimeToVisit = bestTimeToVisit;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getAdministrativeType() {
        return administrativeType;
    }

    public void setAdministrativeType(String administrativeType) {
        this.administrativeType = administrativeType;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getCapital() {
        return capital;
    }

    public void setCapital(String capital) {
        this.capital = capital;
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

    public List<Destination> getDestinations() {
        return destinations;
    }

    public void setDestinations(List<Destination> destinations) {
        this.destinations = destinations;
    }
}
