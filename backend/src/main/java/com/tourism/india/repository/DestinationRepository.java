package com.tourism.india.repository;

import com.tourism.india.entity.Destination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DestinationRepository extends JpaRepository<Destination, Long> {
    @Query("SELECT d FROM Destination d LEFT JOIN FETCH d.state s LEFT JOIN FETCH d.ranking r WHERE d.slug = :slug")
    Optional<Destination> findBySlug(@Param("slug") String slug);

    @Query("SELECT d FROM Destination d LEFT JOIN FETCH d.state s LEFT JOIN FETCH d.ranking r WHERE s.slug = :stateSlug")
    List<Destination> findByStateSlug(@Param("stateSlug") String stateSlug);

    @Query("SELECT d FROM Destination d LEFT JOIN FETCH d.state s LEFT JOIN FETCH d.ranking r WHERE s.slug = :stateSlug ORDER BY r.rankPosition ASC, d.id ASC")
    List<Destination> findTopDestinationsByStateSlug(@Param("stateSlug") String stateSlug);

    @Query("SELECT DISTINCT d.category FROM Destination d WHERE d.category IS NOT NULL ORDER BY d.category ASC")
    List<String> findAllCategories();

    @Query("SELECT d FROM Destination d LEFT JOIN FETCH d.state s LEFT JOIN FETCH d.ranking r WHERE " +
           "(:query IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.cityOrDistrict) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.category) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:stateSlug IS NULL OR s.slug = :stateSlug) AND " +
           "(:category IS NULL OR LOWER(d.category) = LOWER(:category)) " +
           "ORDER BY " +
           "CASE WHEN :sort = 'rank' THEN r.rankPosition END ASC, " +
           "CASE WHEN :sort = 'name' THEN d.name END ASC, " +
           "d.id ASC")
    List<Destination> searchAndFilter(
            @Param("query") String query,
            @Param("stateSlug") String stateSlug,
            @Param("category") String category,
            @Param("sort") String sort
    );

    @Query("SELECT d FROM Destination d LEFT JOIN FETCH d.state s LEFT JOIN FETCH d.ranking r WHERE " +
           "(:query IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.cityOrDistrict) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.category) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:stateSlug IS NULL OR s.slug = :stateSlug) AND " +
           "LOWER(d.category) IN :categories " +
           "ORDER BY " +
           "CASE WHEN :sort = 'rank' THEN r.rankPosition END ASC, " +
           "CASE WHEN :sort = 'name' THEN d.name END ASC, " +
           "d.id ASC")
    List<Destination> searchAndFilterByCategories(
            @Param("query") String query,
            @Param("stateSlug") String stateSlug,
            @Param("categories") List<String> categories,
            @Param("sort") String sort
    );
}
