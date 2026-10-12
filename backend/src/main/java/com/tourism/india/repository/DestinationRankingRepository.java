package com.tourism.india.repository;

import com.tourism.india.entity.DestinationRanking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DestinationRankingRepository extends JpaRepository<DestinationRanking, Long> {
    Optional<DestinationRanking> findByDestinationId(Long destinationId);
}
