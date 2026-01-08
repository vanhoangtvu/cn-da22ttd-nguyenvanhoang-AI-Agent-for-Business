package com.business.springservice.service;

import com.business.springservice.dto.SystemAnalyticsDataDTO;
import com.business.springservice.entity.*;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.enums.Role;
import com.business.springservice.enums.Status;
import com.business.springservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

        private final UserRepository userRepository;
        private final ProductRepository productRepository;
        private final CategoryRepository categoryRepository;
        private final OrderRepository orderRepository;
        private final BusinessDocumentRepository businessDocumentRepository;
        private final DiscountRepository discountRepository;
        private final CartRepository cartRepository;

        @Transactional(readOnly = true)
        public SystemAnalyticsDataDTO getSystemAnalyticsData() {
                SystemAnalyticsDataDTO data = new SystemAnalyticsDataDTO();

                // User data
                List<User> allUsers = userRepository.findAll();
                data.setTotalUsers((long) allUsers.size());
                data.setTotalCustomers(allUsers.stream().filter(u -> u.getRole() == Role.CUSTOMER).count());
                data.setTotalBusinessUsers(allUsers.stream().filter(u -> u.getRole() == Role.BUSINESS).count());
                data.setUsers(allUsers.stream()
                                .map(u -> new SystemAnalyticsDataDTO.UserSummaryDTO(
                                                u.getId(),
                                                u.getUsername(),
                                                u.getEmail(),
                                                u.getRole().name(),
                                                u.getAccountStatus().name(),
                                                u.getAddress(),
                                                u.getPhoneNumber()))
                                .collect(Collectors.toList()));

                // Product data
                List<Product> allProducts = productRepository.findAll();
                data.setTotalProducts((long) allProducts.size());
                data.setActiveProducts(allProducts.stream().filter(p -> p.getStatus() == Status.ACTIVE).count());

                // Calculate product sales data
                List<Order> allOrders = orderRepository.findAll();
                Map<Long, Integer> productSalesMap = new HashMap<>();
                Map<Long, BigDecimal> productRevenueMap = new HashMap<>();

                allOrders.stream()
                                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                                .flatMap(order -> order.getOrderItems().stream())
                                .forEach(item -> {
                                        Long productId = item.getProduct().getId();
                                        productSalesMap.merge(productId, item.getQuantity(), Integer::sum);
                                        productRevenueMap.merge(productId, item.getSubtotal(), BigDecimal::add);
                                });

                data.setProducts(allProducts.stream()
                                .map(p -> new SystemAnalyticsDataDTO.ProductAnalyticsDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getDescription(),
                                                p.getPrice(),
                                                p.getQuantity(),
                                                p.getStatus().name(),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername(),
                                                p.getSeller().getId(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getImageUrls(),
                                                p.getDetails() // Include detailed product specifications JSON
                                ))
                                .collect(Collectors.toList()));

                // Category data
                List<Category> allCategories = categoryRepository.findAll();
                data.setCategories(allCategories.stream()
                                .map(c -> new SystemAnalyticsDataDTO.CategorySummaryDTO(
                                                c.getId(),
                                                c.getName(),
                                                c.getDescription(),
                                                c.getStatus().name(),
                                                (int) allProducts.stream()
                                                                .filter(p -> p.getCategory().getId().equals(c.getId()))
                                                                .count()))
                                .collect(Collectors.toList()));

                // Order data
                data.setTotalOrders((long) allOrders.size());
                data.setDeliveredOrders(allOrders.stream().filter(o -> o.getStatus() == OrderStatus.DELIVERED).count());
                data.setPendingOrders(allOrders.stream().filter(o -> o.getStatus() == OrderStatus.PENDING).count());

                data.setOrders(allOrders.stream()
                                .map(o -> {
                                        List<SystemAnalyticsDataDTO.OrderItemSummaryDTO> items = o.getOrderItems()
                                                        .stream()
                                                        .map(item -> new SystemAnalyticsDataDTO.OrderItemSummaryDTO(
                                                                        item.getProduct().getId(),
                                                                        item.getProductName(),
                                                                        item.getQuantity(),
                                                                        item.getProductPrice(),
                                                                        item.getSubtotal()))
                                                        .collect(Collectors.toList());

                                        return new SystemAnalyticsDataDTO.OrderAnalyticsDTO(
                                                        o.getId(),
                                                        o.getCustomer().getId(),
                                                        o.getCustomerName(),
                                                        o.getStatus().name(),
                                                        o.getTotalAmount(),
                                                        o.getOrderItems().size(),
                                                        o.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                                        items);
                                })
                                .collect(Collectors.toList()));

                // Revenue data
                List<Order> deliveredOrders = allOrders.stream()
                                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                                .collect(Collectors.toList());

                data.setTotalRevenue(deliveredOrders.stream()
                                .map(Order::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Monthly revenue (last 30 days)
                LocalDateTime monthAgo = LocalDateTime.now().minusDays(30);
                data.setMonthlyRevenue(deliveredOrders.stream()
                                .filter(o -> o.getCreatedAt().isAfter(monthAgo))
                                .map(Order::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Weekly revenue (last 7 days)
                LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
                data.setWeeklyRevenue(deliveredOrders.stream()
                                .filter(o -> o.getCreatedAt().isAfter(weekAgo))
                                .map(Order::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Daily revenue (today)
                LocalDate today = LocalDate.now();
                data.setDailyRevenue(deliveredOrders.stream()
                                .filter(o -> o.getCreatedAt().toLocalDate().equals(today))
                                .map(Order::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Revenue by business
                List<User> businessUsers = allUsers.stream()
                                .filter(u -> u.getRole() == Role.BUSINESS)
                                .collect(Collectors.toList());

                data.setRevenueByBusiness(businessUsers.stream()
                                .map(business -> {
                                        BigDecimal revenue = deliveredOrders.stream()
                                                        .flatMap(order -> order.getOrderItems().stream())
                                                        .filter(item -> item.getProduct().getSeller().getId()
                                                                        .equals(business.getId()))
                                                        .map(OrderItem::getSubtotal)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                                        long orders = deliveredOrders.stream()
                                                        .filter(order -> order.getOrderItems().stream()
                                                                        .anyMatch(item -> item.getProduct().getSeller()
                                                                                        .getId()
                                                                                        .equals(business.getId())))
                                                        .count();

                                        long productsSold = deliveredOrders.stream()
                                                        .flatMap(order -> order.getOrderItems().stream())
                                                        .filter(item -> item.getProduct().getSeller().getId()
                                                                        .equals(business.getId()))
                                                        .mapToLong(OrderItem::getQuantity)
                                                        .sum();

                                        return new SystemAnalyticsDataDTO.RevenueByBusinessDTO(
                                                        business.getId(),
                                                        business.getUsername(),
                                                        revenue,
                                                        orders,
                                                        productsSold);
                                })
                                .collect(Collectors.toList()));

                // Business performance
                data.setBusinessPerformance(businessUsers.stream()
                                .map(business -> {
                                        List<Product> businessProducts = allProducts.stream()
                                                        .filter(p -> p.getSeller().getId().equals(business.getId()))
                                                        .collect(Collectors.toList());

                                        int totalProducts = businessProducts.size();
                                        int activeProducts = (int) businessProducts.stream()
                                                        .filter(p -> p.getStatus() == Status.ACTIVE)
                                                        .count();

                                        BigDecimal inventoryValue = businessProducts.stream()
                                                        .map(p -> p.getPrice()
                                                                        .multiply(BigDecimal.valueOf(p.getQuantity())))
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                                        List<Order> businessOrders = deliveredOrders.stream()
                                                        .filter(order -> order.getOrderItems().stream()
                                                                        .anyMatch(item -> item.getProduct().getSeller()
                                                                                        .getId()
                                                                                        .equals(business.getId())))
                                                        .collect(Collectors.toList());

                                        long totalOrders = businessOrders.size();

                                        BigDecimal revenue = businessOrders.stream()
                                                        .flatMap(order -> order.getOrderItems().stream())
                                                        .filter(item -> item.getProduct().getSeller().getId()
                                                                        .equals(business.getId()))
                                                        .map(OrderItem::getSubtotal)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                                        double averageOrderValue = totalOrders > 0
                                                        ? revenue.divide(BigDecimal.valueOf(totalOrders), 2,
                                                                        RoundingMode.HALF_UP).doubleValue()
                                                        : 0.0;

                                        return new SystemAnalyticsDataDTO.BusinessPerformanceDTO(
                                                        business.getId(),
                                                        business.getUsername(),
                                                        totalProducts,
                                                        activeProducts,
                                                        inventoryValue,
                                                        totalOrders,
                                                        revenue,
                                                        averageOrderValue);
                                })
                                .collect(Collectors.toList()));

                // Top selling products
                data.setTopSellingProducts(allProducts.stream()
                                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getQuantity(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername()))
                                .sorted((a, b) -> Integer.compare(b.getTotalSold(), a.getTotalSold()))
                                .limit(20)
                                .collect(Collectors.toList()));

                // Low stock products
                data.setLowStockProducts(allProducts.stream()
                                .filter(p -> p.getStatus() == Status.ACTIVE && p.getQuantity() > 0
                                                && p.getQuantity() < 10)
                                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getQuantity(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername()))
                                .sorted(Comparator.comparingInt(
                                                SystemAnalyticsDataDTO.ProductPerformanceDTO::getQuantityInStock))
                                .collect(Collectors.toList()));

                // Business documents
                List<BusinessDocument> allDocuments = businessDocumentRepository.findAll();
                data.setTotalDocuments((long) allDocuments.size());
                data.setBusinessDocuments(allDocuments.stream()
                                .map(doc -> new SystemAnalyticsDataDTO.BusinessDocumentSummaryDTO(
                                                doc.getId(),
                                                doc.getBusiness().getId(),
                                                doc.getBusiness().getUsername(),
                                                doc.getFileName(),
                                                doc.getFileType(),
                                                doc.getFilePath(),
                                                doc.getFileSize(),
                                                doc.getDescription(),
                                                doc.getUploadedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                                .collect(Collectors.toList()));

                // Discount analytics
                List<Discount> allDiscounts = discountRepository.findAll();
                data.setTotalDiscounts((long) allDiscounts.size());
                data.setActiveDiscounts(allDiscounts.stream()
                                .filter(d -> d.getStatus() == Status.ACTIVE &&
                                                (d.getEndDate() == null || d.getEndDate().isAfter(LocalDateTime.now())))
                                .count());
                data.setTotalDiscountUsage(allDiscounts.stream()
                                .mapToLong(d -> d.getUsedCount() != null ? d.getUsedCount() : 0)
                                .sum());

                // Calculate total discount savings (estimate based on usage)
                BigDecimal totalSavings = allDiscounts.stream()
                                .map(d -> {
                                        if (d.getUsedCount() == null || d.getUsedCount() == 0)
                                                return BigDecimal.ZERO;

                                        // Estimate savings based on discount type
                                        switch (d.getDiscountType()) {
                                                case FIXED_AMOUNT:
                                                        return d.getDiscountValue()
                                                                        .multiply(new BigDecimal(d.getUsedCount()));
                                                case PERCENTAGE:
                                                        // Estimate average order value for percentage discounts
                                                        BigDecimal avgOrderValue = BigDecimal.valueOf(1500000); // 1.5M
                                                                                                                // VND
                                                                                                                // average
                                                        BigDecimal discountAmount = avgOrderValue
                                                                        .multiply(d.getDiscountValue().divide(
                                                                                        BigDecimal.valueOf(100)));
                                                        if (d.getMaxDiscountAmount() != null && discountAmount
                                                                        .compareTo(d.getMaxDiscountAmount()) > 0) {
                                                                discountAmount = d.getMaxDiscountAmount();
                                                        }
                                                        return discountAmount
                                                                        .multiply(new BigDecimal(d.getUsedCount()));
                                                case FREE_SHIPPING:
                                                        // Estimate shipping cost savings
                                                        return BigDecimal.valueOf(30000)
                                                                        .multiply(new BigDecimal(d.getUsedCount()));
                                                default:
                                                        return BigDecimal.ZERO;
                                        }
                                })
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                data.setTotalDiscountSavings(totalSavings);

                data.setDiscounts(allDiscounts.stream()
                                .map(d -> {
                                        // Calculate usage percentage
                                        Double usagePercentage = null;
                                        if (d.getUsageLimit() != null && d.getUsageLimit() > 0) {
                                                usagePercentage = (d.getUsedCount() != null
                                                                ? d.getUsedCount().doubleValue()
                                                                : 0.0)
                                                                / d.getUsageLimit().doubleValue() * 100.0;
                                        }

                                        // Calculate individual discount savings
                                        BigDecimal individualSavings = BigDecimal.ZERO;
                                        if (d.getUsedCount() != null && d.getUsedCount() > 0) {
                                                switch (d.getDiscountType()) {
                                                        case FIXED_AMOUNT:
                                                                individualSavings = d.getDiscountValue().multiply(
                                                                                new BigDecimal(d.getUsedCount()));
                                                                break;
                                                        case PERCENTAGE:
                                                                BigDecimal avgOrder = BigDecimal.valueOf(1500000);
                                                                BigDecimal discountAmt = avgOrder.multiply(d
                                                                                .getDiscountValue()
                                                                                .divide(BigDecimal.valueOf(100)));
                                                                if (d.getMaxDiscountAmount() != null && discountAmt
                                                                                .compareTo(d.getMaxDiscountAmount()) > 0) {
                                                                        discountAmt = d.getMaxDiscountAmount();
                                                                }
                                                                individualSavings = discountAmt.multiply(
                                                                                new BigDecimal(d.getUsedCount()));
                                                                break;
                                                        case FREE_SHIPPING:
                                                                individualSavings = BigDecimal.valueOf(30000).multiply(
                                                                                new BigDecimal(d.getUsedCount()));
                                                                break;
                                                }
                                        }

                                        return new SystemAnalyticsDataDTO.DiscountAnalyticsDTO(
                                                        d.getId(),
                                                        d.getCode(),
                                                        d.getName(),
                                                        d.getDescription(),
                                                        d.getDiscountType().name(),
                                                        d.getDiscountValue(),
                                                        d.getMinOrderValue(),
                                                        d.getMaxDiscountAmount(),
                                                        d.getUsageLimit(),
                                                        d.getUsedCount() != null ? d.getUsedCount() : 0,
                                                        d.getStatus().name(),
                                                        d.getStartDate() != null ? d.getStartDate().format(
                                                                        DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                                                        d.getEndDate() != null ? d.getEndDate().format(
                                                                        DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                                                        d.getCreatedBy().getUsername(),
                                                        d.getCreatedBy().getId(),
                                                        d.isValid(),
                                                        d.isExpired(),
                                                        d.isUsageLimitReached(),
                                                        usagePercentage,
                                                        individualSavings,
                                                        d.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                                })
                                .collect(Collectors.toList()));

                // Cart analytics
                List<Cart> allCarts = cartRepository.findAll();
                data.setTotalCarts((long) allCarts.size());
                data.setCartsWithItems(allCarts.stream()
                                .filter(c -> c.getItems() != null && !c.getItems().isEmpty())
                                .count());

                // Calculate total cart value
                BigDecimal totalCartValue = allCarts.stream()
                                .flatMap(c -> c.getItems().stream())
                                .map(item -> item.getProduct().getPrice()
                                                .multiply(BigDecimal.valueOf(item.getQuantity())))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                data.setTotalCartValue(totalCartValue);

                // Build cart details
                data.setCarts(allCarts.stream()
                                .filter(c -> c.getItems() != null && !c.getItems().isEmpty())
                                .map(c -> {
                                        List<SystemAnalyticsDataDTO.CartItemAnalyticsDTO> cartItems = c.getItems()
                                                        .stream()
                                                        .map(item -> {
                                                                BigDecimal subtotal = item.getProduct().getPrice()
                                                                                .multiply(BigDecimal.valueOf(
                                                                                                item.getQuantity()));
                                                                return new SystemAnalyticsDataDTO.CartItemAnalyticsDTO(
                                                                                item.getProduct().getId(),
                                                                                item.getProduct().getName(),
                                                                                item.getProduct().getCategory()
                                                                                                .getName(),
                                                                                item.getQuantity(),
                                                                                item.getProduct().getPrice(),
                                                                                subtotal,
                                                                                item.getAddedAt() != null ? item
                                                                                                .getAddedAt()
                                                                                                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                                                                                                : null);
                                                        })
                                                        .collect(Collectors.toList());

                                        BigDecimal cartTotal = cartItems.stream()
                                                        .map(SystemAnalyticsDataDTO.CartItemAnalyticsDTO::getSubtotal)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                                        return new SystemAnalyticsDataDTO.CartAnalyticsDTO(
                                                        c.getId(),
                                                        c.getUser().getId(),
                                                        c.getUser().getUsername(),
                                                        c.getUser().getEmail(),
                                                        cartItems.size(),
                                                        cartTotal,
                                                        c.getUpdatedAt() != null ? c.getUpdatedAt().format(
                                                                        DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                                                        cartItems);
                                })
                                .collect(Collectors.toList()));

                return data;
        }
        
        @Transactional(readOnly = true)
        public SystemAnalyticsDataDTO getBusinessAnalyticsData(Long businessId) {
                // Verify business user exists
                User businessUser = userRepository.findById(businessId)
                                .orElseThrow(() -> new RuntimeException("Business not found with ID: " + businessId));
                
                if (businessUser.getRole() != Role.BUSINESS) {
                        throw new RuntimeException("User is not a BUSINESS user");
                }
                
                SystemAnalyticsDataDTO data = new SystemAnalyticsDataDTO();

                // Only return this business user's info
                data.setTotalUsers(1L);
                data.setTotalBusinessUsers(1L);
                data.setUsers(List.of(
                        new SystemAnalyticsDataDTO.UserSummaryDTO(
                                businessUser.getId(),
                                businessUser.getUsername(),
                                businessUser.getEmail(),
                                businessUser.getRole().name(),
                                businessUser.getAccountStatus().name(),
                                businessUser.getAddress(),
                                businessUser.getPhoneNumber()
                        )
                ));

                // Only products of this business
                List<Product> businessProducts = productRepository.findAll().stream()
                                .filter(p -> p.getSeller().getId().equals(businessId))
                                .collect(Collectors.toList());
                
                data.setTotalProducts((long) businessProducts.size());
                data.setActiveProducts(businessProducts.stream()
                                .filter(p -> p.getStatus() == Status.ACTIVE)
                                .count());

                // Calculate sales data ONLY for this business's products
                List<Order> allOrders = orderRepository.findAll();
                Map<Long, Integer> productSalesMap = new HashMap<>();
                Map<Long, BigDecimal> productRevenueMap = new HashMap<>();

                allOrders.stream()
                                .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .forEach(item -> {
                                        Long productId = item.getProduct().getId();
                                        productSalesMap.merge(productId, item.getQuantity(), Integer::sum);
                                        productRevenueMap.merge(productId, item.getSubtotal(), BigDecimal::add);
                                });

                data.setProducts(businessProducts.stream()
                                .map(p -> new SystemAnalyticsDataDTO.ProductAnalyticsDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getDescription(),
                                                p.getPrice(),
                                                p.getQuantity(),
                                                p.getStatus().name(),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername(),
                                                p.getSeller().getId(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getImageUrls(),
                                                p.getDetails()
                                ))
                                .collect(Collectors.toList()));

                // Categories - only those with business's products
                Set<Long> businessCategoryIds = businessProducts.stream()
                                .map(p -> p.getCategory().getId())
                                .collect(Collectors.toSet());
                
                List<Category> businessCategories = categoryRepository.findAll().stream()
                                .filter(c -> businessCategoryIds.contains(c.getId()))
                                .collect(Collectors.toList());
                
                data.setCategories(businessCategories.stream()
                                .map(c -> new SystemAnalyticsDataDTO.CategorySummaryDTO(
                                                c.getId(),
                                                c.getName(),
                                                c.getDescription(),
                                                c.getStatus().name(),
                                                (int) businessProducts.stream()
                                                                .filter(p -> p.getCategory().getId().equals(c.getId()))
                                                                .count()))
                                .collect(Collectors.toList()));

                // Orders - only orders containing this business's products
                List<Order> businessOrders = allOrders.stream()
                                .filter(order -> order.getOrderItems().stream()
                                                .anyMatch(item -> item.getProduct().getSeller().getId().equals(businessId)))
                                .collect(Collectors.toList());
                
                data.setTotalOrders((long) businessOrders.size());
                data.setDeliveredOrders(businessOrders.stream()
                                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                                .count());
                data.setPendingOrders(businessOrders.stream()
                                .filter(o -> o.getStatus() == OrderStatus.PENDING)
                                .count());

                data.setOrders(businessOrders.stream()
                                .map(o -> {
                                        // Only include items of this business
                                        List<SystemAnalyticsDataDTO.OrderItemSummaryDTO> items = o.getOrderItems()
                                                        .stream()
                                                        .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                                        .map(item -> new SystemAnalyticsDataDTO.OrderItemSummaryDTO(
                                                                        item.getProduct().getId(),
                                                                        item.getProductName(),
                                                                        item.getQuantity(),
                                                                        item.getProductPrice(),
                                                                        item.getSubtotal()))
                                                        .collect(Collectors.toList());

                                        return new SystemAnalyticsDataDTO.OrderAnalyticsDTO(
                                                        o.getId(),
                                                        o.getCustomer().getId(),
                                                        o.getCustomerName(),
                                                        o.getStatus().name(),
                                                        o.getTotalAmount(),
                                                        items.size(),
                                                        o.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                                        items);
                                })
                                .collect(Collectors.toList()));

                // Revenue - ONLY for this business
                List<Order> deliveredBusinessOrders = businessOrders.stream()
                                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                                .collect(Collectors.toList());

                BigDecimal totalRevenue = deliveredBusinessOrders.stream()
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .map(OrderItem::getSubtotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                data.setTotalRevenue(totalRevenue);

                // Monthly revenue
                LocalDateTime monthAgo = LocalDateTime.now().minusDays(30);
                data.setMonthlyRevenue(deliveredBusinessOrders.stream()
                                .filter(o -> o.getCreatedAt().isAfter(monthAgo))
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .map(OrderItem::getSubtotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Weekly revenue
                LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
                data.setWeeklyRevenue(deliveredBusinessOrders.stream()
                                .filter(o -> o.getCreatedAt().isAfter(weekAgo))
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .map(OrderItem::getSubtotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Daily revenue
                LocalDate today = LocalDate.now();
                data.setDailyRevenue(deliveredBusinessOrders.stream()
                                .filter(o -> o.getCreatedAt().toLocalDate().equals(today))
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .map(OrderItem::getSubtotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));

                // Revenue by business - only this business
                long productsSold = deliveredBusinessOrders.stream()
                                .flatMap(order -> order.getOrderItems().stream())
                                .filter(item -> item.getProduct().getSeller().getId().equals(businessId))
                                .mapToLong(OrderItem::getQuantity)
                                .sum();

                data.setRevenueByBusiness(List.of(
                        new SystemAnalyticsDataDTO.RevenueByBusinessDTO(
                                businessUser.getId(),
                                businessUser.getUsername(),
                                totalRevenue,
                                (long) deliveredBusinessOrders.size(),
                                productsSold
                        )
                ));

                // Business performance - only this business
                int totalProducts = businessProducts.size();
                int activeProducts = (int) businessProducts.stream()
                                .filter(p -> p.getStatus() == Status.ACTIVE)
                                .count();

                BigDecimal inventoryValue = businessProducts.stream()
                                .map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getQuantity())))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                double averageOrderValue = deliveredBusinessOrders.size() > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(deliveredBusinessOrders.size()), 2, RoundingMode.HALF_UP).doubleValue()
                                : 0.0;

                data.setBusinessPerformance(List.of(
                        new SystemAnalyticsDataDTO.BusinessPerformanceDTO(
                                businessUser.getId(),
                                businessUser.getUsername(),
                                totalProducts,
                                activeProducts,
                                inventoryValue,
                                (long) deliveredBusinessOrders.size(),
                                totalRevenue,
                                averageOrderValue
                        )
                ));

                // Top selling products - only from this business
                data.setTopSellingProducts(businessProducts.stream()
                                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getQuantity(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername()))
                                .sorted((a, b) -> Integer.compare(b.getTotalSold(), a.getTotalSold()))
                                .limit(20)
                                .collect(Collectors.toList()));

                // Low stock products - only from this business
                data.setLowStockProducts(businessProducts.stream()
                                .filter(p -> p.getStatus() == Status.ACTIVE && p.getQuantity() > 0 && p.getQuantity() < 10)
                                .map(p -> new SystemAnalyticsDataDTO.ProductPerformanceDTO(
                                                p.getId(),
                                                p.getName(),
                                                p.getQuantity(),
                                                productSalesMap.getOrDefault(p.getId(), 0),
                                                productRevenueMap.getOrDefault(p.getId(), BigDecimal.ZERO),
                                                p.getCategory().getName(),
                                                p.getSeller().getUsername()))
                                .sorted(Comparator.comparingInt(SystemAnalyticsDataDTO.ProductPerformanceDTO::getQuantityInStock))
                                .collect(Collectors.toList()));

                // Business documents - only this business's documents
                List<BusinessDocument> businessDocuments = businessDocumentRepository.findAll().stream()
                                .filter(doc -> doc.getBusiness().getId().equals(businessId))
                                .collect(Collectors.toList());
                
                data.setTotalDocuments((long) businessDocuments.size());
                data.setBusinessDocuments(businessDocuments.stream()
                                .map(doc -> new SystemAnalyticsDataDTO.BusinessDocumentSummaryDTO(
                                                doc.getId(),
                                                doc.getBusiness().getId(),
                                                doc.getBusiness().getUsername(),
                                                doc.getFileName(),
                                                doc.getFileType(),
                                                doc.getFilePath(),
                                                doc.getFileSize(),
                                                doc.getDescription(),
                                                doc.getUploadedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                                .collect(Collectors.toList()));

                // Discounts - only created by this business
                List<Discount> businessDiscounts = discountRepository.findAll().stream()
                                .filter(d -> d.getCreatedBy().getId().equals(businessId))
                                .collect(Collectors.toList());
                
                data.setTotalDiscounts((long) businessDiscounts.size());
                data.setActiveDiscounts(businessDiscounts.stream()
                                .filter(d -> d.getStatus() == Status.ACTIVE &&
                                                (d.getEndDate() == null || d.getEndDate().isAfter(LocalDateTime.now())))
                                .count());
                data.setTotalDiscountUsage(businessDiscounts.stream()
                                .mapToLong(d -> d.getUsedCount() != null ? d.getUsedCount() : 0)
                                .sum());

                // Calculate discount savings for this business only
                BigDecimal totalSavings = businessDiscounts.stream()
                                .map(d -> {
                                        if (d.getUsedCount() == null || d.getUsedCount() == 0)
                                                return BigDecimal.ZERO;

                                        switch (d.getDiscountType()) {
                                                case FIXED_AMOUNT:
                                                        return d.getDiscountValue().multiply(new BigDecimal(d.getUsedCount()));
                                                case PERCENTAGE:
                                                        BigDecimal avgOrderValue = BigDecimal.valueOf(1500000);
                                                        BigDecimal discountAmount = avgOrderValue
                                                                        .multiply(d.getDiscountValue().divide(BigDecimal.valueOf(100)));
                                                        if (d.getMaxDiscountAmount() != null && discountAmount.compareTo(d.getMaxDiscountAmount()) > 0) {
                                                                discountAmount = d.getMaxDiscountAmount();
                                                        }
                                                        return discountAmount.multiply(new BigDecimal(d.getUsedCount()));
                                                case FREE_SHIPPING:
                                                        return BigDecimal.valueOf(30000).multiply(new BigDecimal(d.getUsedCount()));
                                                default:
                                                        return BigDecimal.ZERO;
                                        }
                                })
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                data.setTotalDiscountSavings(totalSavings);

                data.setDiscounts(businessDiscounts.stream()
                                .map(d -> {
                                        Double usagePercentage = null;
                                        if (d.getUsageLimit() != null && d.getUsageLimit() > 0) {
                                                usagePercentage = (d.getUsedCount() != null ? d.getUsedCount().doubleValue() : 0.0)
                                                                / d.getUsageLimit().doubleValue() * 100.0;
                                        }

                                        BigDecimal individualSavings = BigDecimal.ZERO;
                                        if (d.getUsedCount() != null && d.getUsedCount() > 0) {
                                                switch (d.getDiscountType()) {
                                                        case FIXED_AMOUNT:
                                                                individualSavings = d.getDiscountValue().multiply(new BigDecimal(d.getUsedCount()));
                                                                break;
                                                        case PERCENTAGE:
                                                                BigDecimal avgOrder = BigDecimal.valueOf(1500000);
                                                                BigDecimal discountAmt = avgOrder.multiply(d.getDiscountValue().divide(BigDecimal.valueOf(100)));
                                                                if (d.getMaxDiscountAmount() != null && discountAmt.compareTo(d.getMaxDiscountAmount()) > 0) {
                                                                        discountAmt = d.getMaxDiscountAmount();
                                                                }
                                                                individualSavings = discountAmt.multiply(new BigDecimal(d.getUsedCount()));
                                                                break;
                                                        case FREE_SHIPPING:
                                                                individualSavings = BigDecimal.valueOf(30000).multiply(new BigDecimal(d.getUsedCount()));
                                                                break;
                                                }
                                        }

                                        return new SystemAnalyticsDataDTO.DiscountAnalyticsDTO(
                                                        d.getId(),
                                                        d.getCode(),
                                                        d.getName(),
                                                        d.getDescription(),
                                                        d.getDiscountType().name(),
                                                        d.getDiscountValue(),
                                                        d.getMinOrderValue(),
                                                        d.getMaxDiscountAmount(),
                                                        d.getUsageLimit(),
                                                        d.getUsedCount() != null ? d.getUsedCount() : 0,
                                                        d.getStatus().name(),
                                                        d.getStartDate() != null ? d.getStartDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                                                        d.getEndDate() != null ? d.getEndDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                                                        d.getCreatedBy().getUsername(),
                                                        d.getCreatedBy().getId(),
                                                        d.isValid(),
                                                        d.isExpired(),
                                                        d.isUsageLimitReached(),
                                                        usagePercentage,
                                                        individualSavings,
                                                        d.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                                })
                                .collect(Collectors.toList()));

                // Cart analytics - không áp dụng cho business (chỉ dành cho admin)
                data.setTotalCarts(0L);
                data.setCartsWithItems(0L);
                data.setTotalCartValue(BigDecimal.ZERO);
                data.setCarts(new ArrayList<>());

                return data;
        }
}
