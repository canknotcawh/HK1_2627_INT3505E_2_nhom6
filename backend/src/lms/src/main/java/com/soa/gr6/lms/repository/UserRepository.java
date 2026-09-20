package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    
    Optional<User> findByKeycloakSubject(String keycloakSubject);
}
