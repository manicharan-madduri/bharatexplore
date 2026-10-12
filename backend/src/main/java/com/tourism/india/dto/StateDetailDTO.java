package com.tourism.india.dto;

import java.util.ArrayList;
import java.util.List;

public class StateDetailDTO extends StateDTO {
    private String fullDescription;
    private List<DestinationDTO> destinations = new ArrayList<>();

    public StateDetailDTO() {}

    public String getFullDescription() {
        return fullDescription;
    }

    public void setFullDescription(String fullDescription) {
        this.fullDescription = fullDescription;
    }

    public List<DestinationDTO> getDestinations() {
        return destinations;
    }

    public void setDestinations(List<DestinationDTO> destinations) {
        this.destinations = destinations;
    }
}
