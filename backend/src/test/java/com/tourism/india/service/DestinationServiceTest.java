package com.tourism.india.service;

import com.tourism.india.dto.DestinationDTO;
import com.tourism.india.dto.DestinationDetailDTO;
import com.tourism.india.entity.Destination;
import com.tourism.india.entity.DestinationRanking;
import com.tourism.india.entity.State;
import com.tourism.india.exception.ResourceNotFoundException;
import com.tourism.india.repository.DestinationPhotoRepository;
import com.tourism.india.repository.DestinationRankingRepository;
import com.tourism.india.repository.DestinationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DestinationServiceTest {

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private DestinationPhotoRepository photoRepository;

    @Mock
    private DestinationRankingRepository rankingRepository;

    @InjectMocks
    private DestinationService destinationService;

    private Destination sampleDestination;
    private State sampleState;

    @BeforeEach
    void setUp() {
        sampleState = new State("Uttar Pradesh", "uttar-pradesh", "STATE", "Northern", "Lucknow", "Land of Taj", "Full desc", "img", "Oct-Mar");
        sampleState.setId(1L);

        sampleDestination = new Destination();
        sampleDestination.setId(10L);
        sampleDestination.setName("Taj Mahal");
        sampleDestination.setSlug("taj-mahal");
        sampleDestination.setState(sampleState);
        sampleDestination.setCategory("Monument");
        sampleDestination.setCityOrDistrict("Agra");
    }

    @Test
    void testGetDestinationDetailById_Success() {
        when(destinationRepository.findById(10L)).thenReturn(Optional.of(sampleDestination));

        DestinationDetailDTO dto = destinationService.getDestinationDetailById(10L);

        assertNotNull(dto);
        assertEquals("Taj Mahal", dto.getName());
        assertEquals("Agra", dto.getCityOrDistrict());
        assertEquals("Uttar Pradesh", dto.getStateName());
    }

    @Test
    void testGetDestinationDetailById_NotFound() {
        when(destinationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> destinationService.getDestinationDetailById(99L));
    }

    @Test
    void testSearchAndFilterDestinations() {
        when(destinationRepository.searchAndFilter("Taj", null, null, "rank"))
                .thenReturn(Arrays.asList(sampleDestination));

        List<DestinationDTO> results = destinationService.searchAndFilterDestinations("Taj", null, null, "rank");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Taj Mahal", results.get(0).getName());
    }

    @Test
    void testSearchAndFilterDestinations_CategoryGroupAndLegacySlug() {
        List<String> monumentGroup = DestinationService.expandCategoryGroup("Monument");
        when(destinationRepository.searchAndFilterByCategories(null, "andaman-nicobar", monumentGroup, "rank"))
                .thenReturn(Arrays.asList(sampleDestination));

        List<DestinationDTO> results = destinationService.searchAndFilterDestinations(
                null, "andaman-and-nicobar-islands", "Monument", "rank"
        );

        assertNotNull(results);
        assertEquals(1, results.size());
        assertTrue(monumentGroup.contains("monument"));
        assertTrue(monumentGroup.contains("fort"));
        assertTrue(monumentGroup.contains("heritage"));
    }

    @Test
    void testVerificationStatusPreservedInDTOAndDetailDTO() {
        DestinationRanking verifiedRanking = new DestinationRanking();
        verifiedRanking.setDestination(sampleDestination);
        verifiedRanking.setRankPosition(1);
        verifiedRanking.setReportingYear(2024);
        verifiedRanking.setVisitorCount(6500000L);
        verifiedRanking.setVisitorCountType("TOTAL");
        verifiedRanking.setSourceOrganization("Archaeological Survey of India (ASI)");
        verifiedRanking.setSourceTitle("Annual Monument Footfall Report 2024");
        verifiedRanking.setSourceUrl("https://asi.nic.in");
        verifiedRanking.setPublicationDate(LocalDate.of(2024, 6, 15));
        verifiedRanking.setLastVerifiedAt(LocalDate.of(2025, 1, 10));
        verifiedRanking.setVerificationStatus("VERIFIED");
        sampleDestination.setRanking(verifiedRanking);

        DestinationDTO summaryDto = destinationService.mapToDTO(sampleDestination);
        assertEquals("VERIFIED", summaryDto.getVerificationStatus());
        assertEquals(1, summaryDto.getRankPosition());

        Destination unresolvedDest = new Destination();
        unresolvedDest.setId(38L);
        unresolvedDest.setName("Dong Valley");
        unresolvedDest.setSlug("dong-valley");
        unresolvedDest.setState(sampleState);
        unresolvedDest.setCategory("Valley");
        unresolvedDest.setCityOrDistrict("Anjaw");

        DestinationRanking unresolvedRanking = new DestinationRanking();
        unresolvedRanking.setDestination(unresolvedDest);
        unresolvedRanking.setRankPosition(18);
        unresolvedRanking.setReportingYear(2024);
        unresolvedRanking.setVisitorCount(15000L);
        unresolvedRanking.setVisitorCountType("TOTAL");
        unresolvedRanking.setSourceOrganization("Arunachal Pradesh Tourism");
        unresolvedRanking.setSourceTitle("State Tourism Statistical Report 2024");
        unresolvedRanking.setSourceUrl("https://tourism.gov.in");
        unresolvedRanking.setPublicationDate(LocalDate.of(2024, 6, 15));
        unresolvedRanking.setLastVerifiedAt(LocalDate.of(2025, 1, 10));
        unresolvedRanking.setVerificationStatus("UNRESOLVED");
        unresolvedDest.setRanking(unresolvedRanking);

        DestinationDetailDTO detailDto = destinationService.mapToDetailDTO(unresolvedDest);
        assertEquals("UNRESOLVED", detailDto.getVerificationStatus());
        assertNotNull(detailDto.getRankingInfo());
        assertEquals("UNRESOLVED", detailDto.getRankingInfo().getVerificationStatus());
    }
}
