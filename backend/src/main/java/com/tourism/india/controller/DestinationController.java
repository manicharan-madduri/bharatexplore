package com.tourism.india.controller;

import com.tourism.india.dto.*;
import com.tourism.india.service.DestinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/destinations")
@Tag(name = "Tourist Destinations", description = "APIs for Tourist Places, Search, Filtering, Photo Galleries, and Verified Tourism Rankings")
public class DestinationController {

    private final DestinationService destinationService;

    public DestinationController(DestinationService destinationService) {
        this.destinationService = destinationService;
    }

    @GetMapping
    @Operation(summary = "Filter and sort tourist destinations by state, category, or ranking")
    public ResponseEntity<ApiResponse<List<DestinationDTO>>> getDestinations(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "rank") String sort,
            @RequestParam(required = false) String query) {
        List<DestinationDTO> destinations = destinationService.searchAndFilterDestinations(query, state, category, sort);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved destinations", destinations));
    }

    @GetMapping("/search")
    @Operation(summary = "Search tourist destinations by keyword query")
    public ResponseEntity<ApiResponse<List<DestinationDTO>>> searchDestinations(@RequestParam String query) {
        List<DestinationDTO> destinations = destinationService.searchAndFilterDestinations(query, null, null, "rank");
        return ResponseEntity.ok(ApiResponse.success("Successfully searched destinations", destinations));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full details for a specific tourist destination by ID")
    public ResponseEntity<ApiResponse<DestinationDetailDTO>> getDestinationById(@PathVariable Long id) {
        DestinationDetailDTO destination = destinationService.getDestinationDetailById(id);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved destination details", destination));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get full details for a specific tourist destination by slug")
    public ResponseEntity<ApiResponse<DestinationDetailDTO>> getDestinationBySlug(@PathVariable String slug) {
        DestinationDetailDTO destination = destinationService.getDestinationDetailBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved destination details", destination));
    }

    @GetMapping("/{id}/photos")
    @Operation(summary = "Get photo gallery for a specific destination")
    public ResponseEntity<ApiResponse<List<PhotoDTO>>> getPhotosByDestinationId(@PathVariable Long id) {
        List<PhotoDTO> photos = destinationService.getPhotosByDestinationId(id);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved photo gallery", photos));
    }

    @GetMapping("/{id}/ranking")
    @Operation(summary = "Get ranking, visitor count, and official source information for a destination")
    public ResponseEntity<ApiResponse<RankingDTO>> getRankingByDestinationId(@PathVariable Long id) {
        RankingDTO ranking = destinationService.getRankingByDestinationId(id);
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved ranking metadata", ranking));
    }

    @GetMapping("/categories")
    @Operation(summary = "Get list of all available destination categories")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        List<String> categories = destinationService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("Successfully retrieved categories", categories));
    }
}

