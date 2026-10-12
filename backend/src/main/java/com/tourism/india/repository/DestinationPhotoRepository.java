package com.tourism.india.repository;

import com.tourism.india.entity.DestinationPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DestinationPhotoRepository extends JpaRepository<DestinationPhoto, Long> {
    List<DestinationPhoto> findByDestinationIdOrderByDisplayOrderAsc(Long destinationId);
}
