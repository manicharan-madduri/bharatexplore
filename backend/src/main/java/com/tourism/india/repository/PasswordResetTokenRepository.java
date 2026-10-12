package com.tourism.india.repository;

import com.tourism.india.entity.PasswordResetToken;
import com.tourism.india.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByUser(User user);

    @Modifying
    @Transactional
    void deleteByUser(User user);
}
