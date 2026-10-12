package com.tourism.india.service;

import com.tourism.india.dto.*;
import com.tourism.india.entity.Destination;
import com.tourism.india.entity.DestinationPhoto;
import com.tourism.india.entity.DestinationRanking;
import com.tourism.india.exception.ResourceNotFoundException;
import com.tourism.india.repository.DestinationPhotoRepository;
import com.tourism.india.repository.DestinationRankingRepository;
import com.tourism.india.repository.DestinationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DestinationService {

    private static final Map<String, List<String>> CATEGORY_GROUPS = Map.of(
            "historical", List.of(
                    "historical", "heritage", "fort", "palace", "archaeological",
                    "archaeological ruins", "heritage village", "heritage town",
                    "caves", "war memorial", "memorial"
            ),
            "religious", List.of(
                    "religious", "temple", "monastery", "spiritual", "pilgrimage",
                    "buddhist site", "buddhist stupa", "church"
            ),
            "nature", List.of(
                    "nature", "lake", "hill station", "waterfall", "valley",
                    "garden", "gardens", "hill town", "dam", "mountain pass",
                    "peak", "hills", "meadow", "backwaters", "viewpoint",
                    "river viewpoint", "desert", "hill village", "eco village",
                    "nature & wildlife", "island"
            ),
            "wildlife", List.of(
                    "wildlife", "national park", "wildlife sanctuary",
                    "marine life", "zoo", "nature & wildlife"
            ),
            "beach", List.of(
                    "beach", "island", "marine life", "backwaters"
            ),
            "adventure", List.of(
                    "adventure", "mountain pass", "peak", "desert",
                    "caves", "waterfall", "valley", "hills"
            ),
            "cultural", List.of(
                    "cultural", "museum", "heritage village", "heritage town",
                    "art & sculpture", "cultural capital", "village",
                    "tourist village", "eco village", "capital",
                    "border ceremony", "science center", "entertainment",
                    "urban & shopping", "architecture"
            ),
            "monument", List.of(
                    "monument", "fort", "palace", "memorial", "war memorial",
                    "architecture", "archaeological", "archaeological ruins",
                    "heritage", "buddhist stupa"
            )
    );

    private final DestinationRepository destinationRepository;
    private final DestinationPhotoRepository photoRepository;
    private final DestinationRankingRepository rankingRepository;

    public DestinationService(DestinationRepository destinationRepository,
                              DestinationPhotoRepository photoRepository,
                              DestinationRankingRepository rankingRepository) {
        this.destinationRepository = destinationRepository;
        this.photoRepository = photoRepository;
        this.rankingRepository = rankingRepository;
    }

    public static List<String> expandCategoryGroup(String category) {
        if (category == null || category.isBlank()) {
            return List.of();
        }
        String key = category.trim().toLowerCase();
        return CATEGORY_GROUPS.getOrDefault(key, List.of(key));
    }

    public List<DestinationDTO> getTopDestinationsByState(String stateSlug) {
        String resolvedSlug = StateService.resolveSlug(stateSlug);
        List<Destination> destinations = destinationRepository.findTopDestinationsByStateSlug(resolvedSlug);
        return destinations.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public DestinationDetailDTO getDestinationDetailById(Long id) {
        Destination destination = destinationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destination", "id", id));
        return mapToDetailDTO(destination);
    }

    public DestinationDetailDTO getDestinationDetailBySlug(String slug) {
        Destination destination = destinationRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Destination", "slug", slug));
        return mapToDetailDTO(destination);
    }

    public List<PhotoDTO> getPhotosByDestinationId(Long destinationId) {
        if (!destinationRepository.existsById(destinationId)) {
            throw new ResourceNotFoundException("Destination", "id", destinationId);
        }
        return photoRepository.findByDestinationIdOrderByDisplayOrderAsc(destinationId).stream()
                .map(this::mapToPhotoDTO)
                .collect(Collectors.toList());
    }

    public RankingDTO getRankingByDestinationId(Long destinationId) {
        DestinationRanking ranking = rankingRepository.findByDestinationId(destinationId)
                .orElseThrow(() -> new ResourceNotFoundException("DestinationRanking", "destinationId", destinationId));
        return mapToRankingDTO(ranking);
    }

    public List<DestinationDTO> searchAndFilterDestinations(String query, String stateSlug, String category, String sort) {
        String effectiveSort = (sort != null && !sort.isBlank()) ? sort : "rank";
        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;
        String cleanState = (stateSlug != null && !stateSlug.isBlank()) ? StateService.resolveSlug(stateSlug) : null;
        String cleanCategory = (category != null && !category.isBlank()) ? category.trim() : null;

        List<Destination> destinations;
        if (cleanCategory != null && CATEGORY_GROUPS.containsKey(cleanCategory.toLowerCase())) {
            List<String> expanded = expandCategoryGroup(cleanCategory);
            destinations = destinationRepository.searchAndFilterByCategories(
                    cleanQuery,
                    cleanState,
                    expanded,
                    effectiveSort
            );
        } else {
            destinations = destinationRepository.searchAndFilter(
                    cleanQuery,
                    cleanState,
                    cleanCategory,
                    effectiveSort
            );
        }
        return destinations.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<String> getAllCategories() {
        return destinationRepository.findAllCategories();
    }

    public DestinationDTO mapToDTO(Destination destination) {
        DestinationDTO dto = new DestinationDTO();
        dto.setId(destination.getId());
        dto.setName(destination.getName());
        dto.setSlug(destination.getSlug());
        if (destination.getState() != null) {
            dto.setStateName(destination.getState().getName());
            dto.setStateSlug(destination.getState().getSlug());
        }
        dto.setCityOrDistrict(destination.getCityOrDistrict());
        dto.setShortDescription(destination.getShortDescription());
        dto.setCategory(destination.getCategory());
        dto.setCoverImageUrl(destination.getCoverImageUrl());
        dto.setBestTimeToVisit(destination.getBestTimeToVisit());

        if (destination.getRanking() != null) {
            dto.setRankPosition(destination.getRanking().getRankPosition());
            dto.setReportingYear(destination.getRanking().getReportingYear());
            dto.setVerificationStatus(destination.getRanking().getVerificationStatus());
        }
        return dto;
    }

    public DestinationDetailDTO mapToDetailDTO(Destination destination) {
        DestinationDetailDTO dto = new DestinationDetailDTO();
        dto.setId(destination.getId());
        dto.setName(destination.getName());
        dto.setSlug(destination.getSlug());
        if (destination.getState() != null) {
            dto.setStateName(destination.getState().getName());
            dto.setStateSlug(destination.getState().getSlug());
        }
        dto.setCityOrDistrict(destination.getCityOrDistrict());
        dto.setShortDescription(destination.getShortDescription());
        dto.setFullDescription(destination.getFullDescription());
        dto.setCategory(destination.getCategory());
        dto.setCoverImageUrl(destination.getCoverImageUrl());
        dto.setBestTimeToVisit(destination.getBestTimeToVisit());
        dto.setEstimatedVisitDuration(destination.getEstimatedVisitDuration());
        dto.setHistoricalSignificance(destination.getHistoricalSignificance());
        dto.setMainAttractions(destination.getMainAttractions());
        dto.setTravelTips(destination.getTravelTips());
        dto.setOpeningHours(destination.getOpeningHours());
        dto.setEntryFees(destination.getEntryFees());
        dto.setLatitude(destination.getLatitude());
        dto.setLongitude(destination.getLongitude());

        if (destination.getRanking() != null) {
            dto.setRankPosition(destination.getRanking().getRankPosition());
            dto.setReportingYear(destination.getRanking().getReportingYear());
            dto.setVerificationStatus(destination.getRanking().getVerificationStatus());
            dto.setRankingInfo(mapToRankingDTO(destination.getRanking()));
        }

        if (destination.getPhotos() != null && !destination.getPhotos().isEmpty()) {
            dto.setPhotos(destination.getPhotos().stream().map(this::mapToPhotoDTO).collect(Collectors.toList()));
        }

        return dto;
    }

    public PhotoDTO mapToPhotoDTO(DestinationPhoto photo) {
        return new PhotoDTO(
                photo.getId(),
                photo.getImageUrl(),
                photo.getAltText(),
                photo.getDisplayOrder(),
                photo.getSourceUrl()
        );
    }

    public RankingDTO mapToRankingDTO(DestinationRanking ranking) {
        RankingDTO dto = new RankingDTO();
        dto.setId(ranking.getId());
        if (ranking.getDestination() != null) {
            dto.setDestinationId(ranking.getDestination().getId());
        }
        dto.setRankPosition(ranking.getRankPosition());
        dto.setReportingYear(ranking.getReportingYear());
        dto.setVisitorCount(ranking.getVisitorCount());
        dto.setVisitorCountType(ranking.getVisitorCountType());
        dto.setSourceOrganization(ranking.getSourceOrganization());
        dto.setSourceTitle(ranking.getSourceTitle());
        dto.setSourceUrl(ranking.getSourceUrl());
        dto.setPublicationDate(ranking.getPublicationDate());
        dto.setLastVerifiedAt(ranking.getLastVerifiedAt());
        dto.setVerificationStatus(ranking.getVerificationStatus());
        return dto;
    }
}
