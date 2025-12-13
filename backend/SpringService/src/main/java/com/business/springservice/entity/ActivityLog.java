package com.business.springservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action; // CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, PLACE_ORDER, etc.

    @Column(nullable = false)
    private String entityType; // PRODUCT, ORDER, USER, CATEGORY, etc.

    @Column
    private Long entityId; // ID of the entity that was affected

    @Column(length = 500)
    private String description; // Human readable description

    @Column
    private String details; // Additional details in JSON format

    @Column
    private Long userId; // User who performed the action

    @Column
    private String username; // Username for display

    @Column
    private String userRole; // Role of the user

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private String ipAddress; // IP address of the user

    @Column
    private String userAgent; // Browser/device info
}