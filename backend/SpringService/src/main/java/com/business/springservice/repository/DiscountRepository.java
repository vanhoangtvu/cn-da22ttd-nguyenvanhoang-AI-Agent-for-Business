package com.business.springservice.repository;

import com.business.springservice.entity.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Long> {
    
    // Tìm discount theo code
    Optional<Discount> findByCode(String code);
    
    // Tìm discount theo code và status ACTIVE
    Optional<Discount> findByCodeAndStatus(String code, com.business.springservice.enums.Status status);
    
    // Tìm tất cả discount của một user
    List<Discount> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
    
    // Tìm discount theo status
    List<Discount> findByStatusOrderByCreatedAtDesc(com.business.springservice.enums.Status status);
    
    // Tìm discount còn hiệu lực
    @Query("SELECT d FROM Discount d WHERE d.status = :status AND " +
           "(d.startDate IS NULL OR d.startDate <= :now) AND " +
           "(d.endDate IS NULL OR d.endDate >= :now) AND " +
           "(d.usageLimit IS NULL OR d.usedCount < d.usageLimit)")
    List<Discount> findValidDiscounts(@Param("status") com.business.springservice.enums.Status status, 
                                     @Param("now") LocalDateTime now);
    
    // Tìm discount sắp hết hạn
    @Query("SELECT d FROM Discount d WHERE d.status = :status AND " +
           "d.endDate IS NOT NULL AND d.endDate BETWEEN :now AND :endTime")
    List<Discount> findDiscountsExpiringBetween(@Param("status") com.business.springservice.enums.Status status,
                                               @Param("now") LocalDateTime now,
                                               @Param("endTime") LocalDateTime endTime);
    
    // Tìm discount theo tên (để search)
    @Query("SELECT d FROM Discount d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Discount> findByNameOrCodeContainingIgnoreCase(@Param("keyword") String keyword);
    
    // Kiểm tra code có tồn tại chưa
    boolean existsByCode(String code);
    
    // Kiểm tra code có tồn tại chưa (trừ ID hiện tại)
    boolean existsByCodeAndIdNot(String code, Long id);
    
    // Đếm số lượng discount theo status
    long countByStatus(com.business.springservice.enums.Status status);
    
    // Đếm số lượng discount của user
    long countByCreatedById(Long userId);
}