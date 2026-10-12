package com.tourism.india.service;

import com.tourism.india.dto.DestinationDTO;
import com.tourism.india.dto.StateDTO;
import com.tourism.india.dto.StateDetailDTO;
import com.tourism.india.entity.State;
import com.tourism.india.exception.ResourceNotFoundException;
import com.tourism.india.repository.StateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StateService {

    private static final Map<String, String> SLUG_ALIASES = Map.ofEntries(
            Map.entry("andaman-and-nicobar-islands", "andaman-nicobar"),
            Map.entry("andaman-and-nicobar", "andaman-nicobar"),
            Map.entry("andaman-nicobar-islands", "andaman-nicobar"),
            Map.entry("dadra-nagar-haveli-daman-diu", "daman-and-diu"),
            Map.entry("dadra-and-nagar-haveli-and-daman-and-diu", "daman-and-diu"),
            Map.entry("dadra-and-nagar-haveli", "daman-and-diu"),
            Map.entry("daman-diu", "daman-and-diu"),
            Map.entry("jammu-kashmir", "jammu-and-kashmir"),
            Map.entry("pondicherry", "puducherry"),
            Map.entry("new-delhi", "delhi"),
            Map.entry("nct-of-delhi", "delhi"),
            Map.entry("orissa", "odisha"),
            Map.entry("uttaranchal", "uttarakhand")
    );

    private final StateRepository stateRepository;
    private final DestinationService destinationService;

    public StateService(StateRepository stateRepository, DestinationService destinationService) {
        this.stateRepository = stateRepository;
        this.destinationService = destinationService;
    }

    public static String resolveSlug(String slug) {
        if (slug == null) {
            return null;
        }
        String normalized = slug.trim().toLowerCase();
        return SLUG_ALIASES.getOrDefault(normalized, normalized);
    }

    public List<StateDTO> getAllStates() {
        return stateRepository.findAllByOrderByNameAsc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public StateDTO getStateBySlug(String slug) {
        String resolvedSlug = resolveSlug(slug);
        State state = stateRepository.findBySlug(resolvedSlug)
                .orElseThrow(() -> new ResourceNotFoundException("State", "slug", slug));
        return mapToDTO(state);
    }

    public StateDetailDTO getStateDetailBySlug(String slug) {
        String resolvedSlug = resolveSlug(slug);
        State state = stateRepository.findBySlug(resolvedSlug)
                .orElseThrow(() -> new ResourceNotFoundException("State", "slug", slug));

        StateDetailDTO detailDTO = new StateDetailDTO();
        detailDTO.setId(state.getId());
        detailDTO.setName(state.getName());
        detailDTO.setSlug(state.getSlug());
        detailDTO.setAdministrativeType(state.getAdministrativeType());
        detailDTO.setRegion(state.getRegion());
        detailDTO.setCapital(state.getCapital());
        detailDTO.setShortDescription(state.getShortDescription());
        detailDTO.setFullDescription(state.getFullDescription());
        detailDTO.setCoverImageUrl(state.getCoverImageUrl());
        detailDTO.setBestTimeToVisit(state.getBestTimeToVisit());
        detailDTO.setDestinationCount(state.getDestinations().size());

        List<DestinationDTO> topDestinations = destinationService.getTopDestinationsByState(state.getSlug());
        detailDTO.setDestinations(topDestinations);

        return detailDTO;
    }

    public StateDTO mapToDTO(State state) {
        StateDTO dto = new StateDTO();
        dto.setId(state.getId());
        dto.setName(state.getName());
        dto.setSlug(state.getSlug());
        dto.setAdministrativeType(state.getAdministrativeType());
        dto.setRegion(state.getRegion());
        dto.setCapital(state.getCapital());
        dto.setShortDescription(state.getShortDescription());
        dto.setCoverImageUrl(state.getCoverImageUrl());
        dto.setBestTimeToVisit(state.getBestTimeToVisit());
        dto.setDestinationCount(state.getDestinations() != null ? state.getDestinations().size() : 0);
        return dto;
    }
}
