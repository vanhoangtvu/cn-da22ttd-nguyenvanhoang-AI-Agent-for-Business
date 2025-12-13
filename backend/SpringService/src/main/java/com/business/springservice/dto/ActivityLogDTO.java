package com.business.springservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLogDTO {

    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private String description;
    private String details;
    private Long userId;
    private String username;
    private String userRole;
    private LocalDateTime createdAt;
    private String ipAddress;
    private String userAgent;

    // Additional fields for display
    private String timeAgo; // "2 minutes ago", "1 hour ago", etc.
    private String iconType; // "product", "order", "user", "category", etc.
    private String actionColor; // CSS class for action color
    private String actionDescription; // Human readable action description
    private String entityInfo; // Entity name/info
    private String iconBgColor; // Background color for icon
    private String iconColor; // Icon color
    private String iconPath; // SVG path for icon
}