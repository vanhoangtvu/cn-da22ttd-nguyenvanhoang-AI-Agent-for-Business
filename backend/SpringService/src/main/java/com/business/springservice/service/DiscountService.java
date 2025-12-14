package com.business.springservice.service;

import com.business.springservice.dto.DiscountCreateRequest;
import com.business.springservice.dto.DiscountDTO;
import com.business.springservice.entity.Discount;
import com.business.springservice.entity.User;
import com.business.springservice.repository.DiscountRepository;
import com.business.springservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiscountService {
    
    private final DiscountRepository discountRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<DiscountDTO> getAllDiscounts() {
        return discountRepository.findByStatusOrderByCreatedAtDesc(com.business.springservice.enums.Status.ACTIVE)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<DiscountDTO> getDiscountsByUser(Long userId) {
        return discountRepository.findByCreatedByIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public DiscountDTO getDiscountById(Long id) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Discount not found with id: " + id));
        return convertToDTO(discount);
    }
    
    @Transactional(readOnly = true)
    public DiscountDTO getDiscountByCode(String code) {
        Discount discount = discountRepository.findByCodeAndStatus(code, com.business.springservice.enums.Status.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Discount not found with code: " + code));
        return convertToDTO(discount);
    }
    
    @Transactional(readOnly = true)
    public List<DiscountDTO> getValidDiscounts() {
        return discountRepository.findValidDiscounts(com.business.springservice.enums.Status.ACTIVE, LocalDateTime.now())
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<DiscountDTO> searchDiscounts(String keyword) {
        return discountRepository.findByNameOrCodeContainingIgnoreCase(keyword)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public DiscountDTO createDiscount(DiscountCreateRequest request, Long userId) {
        // Validate discount code uniqueness
        if (discountRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Discount code already exists: " + request.getCode());
        }
        
        // Validate discount type and value
        validateDiscountRequest(request);
        
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Discount discount = new Discount();
        discount.setCode(request.getCode().toUpperCase());
        discount.setName(request.getName());
        discount.setDescription(request.getDescription());
        discount.setDiscountType(Discount.DiscountType.valueOf(request.getDiscountType()));
        discount.setDiscountValue(request.getDiscountValue());
        discount.setMinOrderValue(request.getMinOrderValue());
        discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        discount.setUsageLimit(request.getUsageLimit());
        discount.setStartDate(request.getStartDate());
        discount.setEndDate(request.getEndDate());
        discount.setCreatedBy(creator);
        
        Discount savedDiscount = discountRepository.save(discount);
        return convertToDTO(savedDiscount);
    }
    
    @Transactional
    public DiscountDTO updateDiscount(Long id, DiscountCreateRequest request) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Discount not found with id: " + id));
        
        // Validate code uniqueness (excluding current discount)
        if (!discount.getCode().equals(request.getCode()) && 
            discountRepository.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new RuntimeException("Discount code already exists: " + request.getCode());
        }
        
        // Validate discount request
        validateDiscountRequest(request);
        
        discount.setCode(request.getCode().toUpperCase());
        discount.setName(request.getName());
        discount.setDescription(request.getDescription());
        discount.setDiscountType(Discount.DiscountType.valueOf(request.getDiscountType()));
        discount.setDiscountValue(request.getDiscountValue());
        discount.setMinOrderValue(request.getMinOrderValue());
        discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        discount.setUsageLimit(request.getUsageLimit());
        discount.setStartDate(request.getStartDate());
        discount.setEndDate(request.getEndDate());
        
        Discount updatedDiscount = discountRepository.save(discount);
        return convertToDTO(updatedDiscount);
    }
    
    @Transactional
    public void deleteDiscount(Long id) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Discount not found with id: " + id));
        discount.setStatus(com.business.springservice.enums.Status.INACTIVE);
        discountRepository.save(discount);
    }
    
    @Transactional
    public DiscountDTO updateDiscountStatus(Long id, String status) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Discount not found with id: " + id));
        
        try {
            com.business.springservice.enums.Status newStatus = com.business.springservice.enums.Status.valueOf(status.toUpperCase());
            discount.setStatus(newStatus);
            Discount updatedDiscount = discountRepository.save(discount);
            return convertToDTO(updatedDiscount);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status value. Must be ACTIVE or INACTIVE");
        }
    }
    
    // Áp dụng discount cho đơn hàng
    @Transactional
    public BigDecimal applyDiscount(String discountCode, BigDecimal orderAmount) {
        Discount discount = discountRepository.findByCodeAndStatus(discountCode, com.business.springservice.enums.Status.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Invalid discount code"));
        
        // Kiểm tra discount có còn hiệu lực không
        if (!discount.isValid()) {
            throw new RuntimeException("Discount is not valid or has expired");
        }
        
        // Kiểm tra đơn hàng có đủ giá trị tối thiểu không
        if (discount.getMinOrderValue() != null && orderAmount.compareTo(discount.getMinOrderValue()) < 0) {
            throw new RuntimeException("Order amount must be at least " + discount.getMinOrderValue());
        }
        
        BigDecimal discountAmount = BigDecimal.ZERO;
        
        switch (discount.getDiscountType()) {
            case PERCENTAGE:
                discountAmount = orderAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
                // Áp dụng giới hạn giảm giá tối đa
                if (discount.getMaxDiscountAmount() != null && 
                    discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
                    discountAmount = discount.getMaxDiscountAmount();
                }
                break;
            case FIXED_AMOUNT:
                discountAmount = discount.getDiscountValue();
                // Đảm bảo số tiền giảm không vượt quá tổng đơn hàng
                if (discountAmount.compareTo(orderAmount) > 0) {
                    discountAmount = orderAmount;
                }
                break;
            case FREE_SHIPPING:
                // Trả về 0 vì free shipping không giảm giá sản phẩm
                discountAmount = BigDecimal.ZERO;
                break;
        }
        
        // Tăng số lần sử dụng
        discount.setUsedCount(discount.getUsedCount() + 1);
        discountRepository.save(discount);
        
        return discountAmount;
    }
    
    // Kiểm tra discount có áp dụng được không (không tăng usage count)
    @Transactional(readOnly = true)
    public BigDecimal calculateDiscountAmount(String discountCode, BigDecimal orderAmount) {
        Discount discount = discountRepository.findByCodeAndStatus(discountCode, com.business.springservice.enums.Status.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Invalid discount code"));
        
        if (!discount.isValid()) {
            throw new RuntimeException("Discount is not valid or has expired");
        }
        
        if (discount.getMinOrderValue() != null && orderAmount.compareTo(discount.getMinOrderValue()) < 0) {
            throw new RuntimeException("Order amount must be at least " + discount.getMinOrderValue());
        }
        
        BigDecimal discountAmount = BigDecimal.ZERO;
        
        switch (discount.getDiscountType()) {
            case PERCENTAGE:
                discountAmount = orderAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
                if (discount.getMaxDiscountAmount() != null && 
                    discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
                    discountAmount = discount.getMaxDiscountAmount();
                }
                break;
            case FIXED_AMOUNT:
                discountAmount = discount.getDiscountValue();
                if (discountAmount.compareTo(orderAmount) > 0) {
                    discountAmount = orderAmount;
                }
                break;
            case FREE_SHIPPING:
                discountAmount = BigDecimal.ZERO;
                break;
        }
        
        return discountAmount;
    }
    
    private void validateDiscountRequest(DiscountCreateRequest request) {
        // Validate discount type
        try {
            Discount.DiscountType.valueOf(request.getDiscountType());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid discount type. Must be PERCENTAGE, FIXED_AMOUNT, or FREE_SHIPPING");
        }
        
        // Validate discount value
        if (request.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Discount value must be greater than 0");
        }
        
        // Validate percentage
        if ("PERCENTAGE".equals(request.getDiscountType()) && 
            request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("Percentage discount cannot be greater than 100%");
        }
        
        // Validate dates
        if (request.getStartDate() != null && request.getEndDate() != null && 
            request.getStartDate().isAfter(request.getEndDate())) {
            throw new RuntimeException("Start date must be before end date");
        }
    }
    
    private DiscountDTO convertToDTO(Discount discount) {
        DiscountDTO dto = new DiscountDTO();
        dto.setId(discount.getId());
        dto.setCode(discount.getCode());
        dto.setName(discount.getName());
        dto.setDescription(discount.getDescription());
        dto.setDiscountType(discount.getDiscountType().name());
        dto.setDiscountValue(discount.getDiscountValue());
        dto.setMinOrderValue(discount.getMinOrderValue());
        dto.setMaxDiscountAmount(discount.getMaxDiscountAmount());
        dto.setUsageLimit(discount.getUsageLimit());
        dto.setUsedCount(discount.getUsedCount());
        dto.setStartDate(discount.getStartDate());
        dto.setEndDate(discount.getEndDate());
        dto.setStatus(discount.getStatus().name());
        dto.setCreatedBy(discount.getCreatedBy().getId());
        dto.setCreatedByUsername(discount.getCreatedBy().getUsername());
        dto.setCreatedAt(discount.getCreatedAt());
        dto.setUpdatedAt(discount.getUpdatedAt());
        
        // Helper properties
        dto.setIsValid(discount.isValid());
        dto.setIsExpired(discount.isExpired());
        if (discount.getUsageLimit() != null && discount.getUsageLimit() > 0) {
            dto.setUsagePercentage((double) discount.getUsedCount() / discount.getUsageLimit() * 100);
        }
        
        return dto;
    }
}