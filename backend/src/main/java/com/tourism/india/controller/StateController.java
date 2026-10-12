package com.tourism.india.controller;

import com.tourism.india.dto.ApiResponse;
import com.tourism.india.dto.DestinationDTO;
import com.tourism.india.dto.StateDTO;
import com.tourism.india.dto.StateDetailDTO;
import com.tourism.india.service.DestinationService;
import com.tourism.india.service.StateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/states")
@Tag(name = "States & Union Territories", description = "APIs for Indian Administrative Units and State Detail Views")
public class StateController {

    private final StateService stateService;
    private final DestinationService destinationService;

    public StateController(StateService stateService, DestinationService destinationService) {
        this.stateService = stateService;
        this.destinationService = destinationService;
    }

    @GetMapping
    @Operation(summary = "Get all 36 States and Union Territories of India")
    public ResponseEntity<ApiResponse<List<StateDTO>>> getAllStates() {
        List<StateDTO> states = stateService.getAllStates();
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved all states and UTs", states));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get detailed information for a specific State or Union Territory by slug")
    public ResponseEntity<ApiResponse<StateDetailDTO>> getStateBySlug(@PathVariable String slug) {
        StateDetailDTO stateDetail = stateService.getStateDetailBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved state details", stateDetail));
    }

    @GetMapping("/{slug}/destinations")
    @Operation(summary = "Get top 15 tourist destinations for a specific State or Union Territory")
    public ResponseEntity<ApiResponse<List<DestinationDTO>>> getDestinationsByStateSlug(@PathVariable String slug) {
        List<DestinationDTO> destinations = destinationService.getTopDestinationsByState(slug);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved top destinations for state", destinations));
    }
}
