package com.business.springservice.service;

import com.business.springservice.entity.ActivityLog;
import com.business.springservice.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Transactional
    public void logActivity(String action, String entityType, Long entityId,
                           String description, String details, Long userId,
                           String username, String userRole, String ipAddress,
                           String userAgent) {
        try {
            ActivityLog activityLog = ActivityLog.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .details(details)
                    .userId(userId)
                    .username(username)
                    .userRole(userRole)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            activityLogRepository.save(activityLog);
            log.debug("Activity logged: {} - {} - {}", action, entityType, description);
        } catch (Exception e) {
            log.error("Failed to log activity: {} - {} - {}", action, entityType, description, e);
        }
    }

    public List<ActivityLog> getRecentActivities(int limit) {
        return activityLogRepository.findRecentActivities()
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    public List<ActivityLog> getActivitiesForBusiness(Long businessId, int limit) {
        return activityLogRepository.findActivitiesForBusiness(businessId)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    public List<ActivityLog> getActivitiesByUser(Long userId, int limit) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }
}