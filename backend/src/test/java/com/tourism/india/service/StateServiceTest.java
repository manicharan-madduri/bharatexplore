package com.tourism.india.service;

import com.tourism.india.dto.StateDTO;
import com.tourism.india.dto.StateDetailDTO;
import com.tourism.india.entity.State;
import com.tourism.india.exception.ResourceNotFoundException;
import com.tourism.india.repository.StateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StateServiceTest {

    @Mock
    private StateRepository stateRepository;

    @Mock
    private DestinationService destinationService;

    @InjectMocks
    private StateService stateService;

    private State sampleState;

    @BeforeEach
    void setUp() {
        sampleState = new State(
                "Rajasthan", "rajasthan", "STATE", "Western", "Jaipur",
                "Land of Kings", "Royal palaces and desert landscapes.",
                "https://example.com/rajasthan.jpg", "October to March"
        );
        sampleState.setId(1L);
    }

    @Test
    void testGetAllStates() {
        when(stateRepository.findAllByOrderByNameAsc()).thenReturn(Arrays.asList(sampleState));

        List<StateDTO> states = stateService.getAllStates();

        assertNotNull(states);
        assertEquals(1, states.size());
        assertEquals("Rajasthan", states.get(0).getName());
        assertEquals("rajasthan", states.get(0).getSlug());
    }

    @Test
    void testGetStateBySlug_Success() {
        when(stateRepository.findBySlug("rajasthan")).thenReturn(Optional.of(sampleState));

        StateDTO dto = stateService.getStateBySlug("rajasthan");

        assertNotNull(dto);
        assertEquals("Rajasthan", dto.getName());
        assertEquals("Western", dto.getRegion());
    }

    @Test
    void testGetStateBySlug_NotFound() {
        when(stateRepository.findBySlug("invalid-slug")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> stateService.getStateBySlug("invalid-slug"));
    }

    @Test
    void testGetStateBySlug_LegacyUnionTerritoryAlias() {
        State andaman = new State(
                "Andaman and Nicobar Islands", "andaman-nicobar", "UNION_TERRITORY", "Islands", "Port Blair",
                "Tropical archipelago", "Full desc", "img", "Oct-May"
        );
        andaman.setId(2L);
        when(stateRepository.findBySlug("andaman-nicobar")).thenReturn(Optional.of(andaman));

        StateDTO dto = stateService.getStateBySlug("andaman-and-nicobar-islands");

        assertNotNull(dto);
        assertEquals("Andaman and Nicobar Islands", dto.getName());
        assertEquals("andaman-nicobar", dto.getSlug());
    }
}
