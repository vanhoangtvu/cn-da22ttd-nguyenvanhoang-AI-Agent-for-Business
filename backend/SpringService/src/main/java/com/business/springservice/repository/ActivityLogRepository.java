package com.business.springservice.repository;

import com.business.springservice.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    // Get recent activities (last 50 activities)
    @Query("SELECT a FROM ActivityLog a ORDER BY a.createdAt DESC")
    List<ActivityLog> findRecentActivities();

    // Get activities by user
    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Get activities by entity type
    List<ActivityLog> findByEntityTypeOrderByCreatedAtDesc(String entityType);

    // Get activities within date range
    List<ActivityLog> findByCreatedAtBetweenOrderByCreatedAtDesc(
        LocalDateTime startDate,
        LocalDateTime endDate
    );

    // Get activities by action type
    List<ActivityLog> findByActionOrderByCreatedAtDesc(String action);

    // Get activities for business user (activities performed by the business user)
    @Query("SELECT a FROM ActivityLog a WHERE a.userId = :businessId ORDER BY a.createdAt DESC")
    List<ActivityLog> findActivitiesForBusiness(@Param("businessId") Long businessId);
}