package com.tourism.india.repository;

import com.tourism.india.entity.State;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StateRepository extends JpaRepository<State, Long> {
    Optional<State> findBySlug(String slug);
    List<State> findAllByOrderByNameAsc();
    List<State> findByRegionOrderByNameAsc(String region);
    List<State> findByAdministrativeTypeOrderByNameAsc(String administrativeType);
}
