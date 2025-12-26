package com.business.springservice.service;

import com.business.springservice.dto.OrderCreateRequest;
import com.business.springservice.dto.OrderDTO;
import com.business.springservice.dto.OrderItemDTO;
import com.business.springservice.entity.Order;
import com.business.springservice.entity.OrderItem;
import com.business.springservice.entity.Product;
import com.business.springservice.entity.User;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.repository.OrderRepository;
import com.business.springservice.repository.ProductRepository;
import com.business.springservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartService cartService;
    private final VietQRService vietQRService;

    @Transactional
    public OrderDTO createOrder(OrderCreateRequest request, Long customerId) {
        // Validate customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Validate all products exist and calculate total
        BigDecimal totalAmount = BigDecimal.ZERO;

        Order order = new Order();
        order.setCustomer(customer);
        order.setCustomerName(customer.getUsername());
        order.setCustomerEmail(customer.getEmail());
        order.setCustomerPhone(customer.getPhoneNumber());
        order.setShippingAddress(customer.getAddress());
        order.setNote(request.getNote());
        order.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH");
        order.setStatus(OrderStatus.PENDING);

        // Create order items
        for (OrderCreateRequest.OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(
                            () -> new RuntimeException("Product not found with id: " + itemRequest.getProductId()));

            // Check if product is active
            if (product.getStatus() != com.business.springservice.enums.Status.ACTIVE) {
                throw new RuntimeException("Product is not available: " + product.getName());
            }

            // Check stock
            if (product.getQuantity() < itemRequest.getQuantity()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName());
            }

            // Create order item
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setProductPrice(product.getPrice());
            orderItem.setQuantity(itemRequest.getQuantity());

            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            orderItem.setSubtotal(subtotal);

            order.getOrderItems().add(orderItem);
            totalAmount = totalAmount.add(subtotal);

            // Reduce product quantity
            product.setQuantity(product.getQuantity() - itemRequest.getQuantity());
            productRepository.save(product);
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);

        // Clear cart after successful order creation
        try {
            cartService.clearCart(customerId);
        } catch (Exception e) {
            // Log error but don't fail the order creation
            System.err.println("Failed to clear cart after order creation: " + e.getMessage());
        }

        return convertToDTO(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        return convertToDTO(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO updateOrderStatus(Long orderId, String statusStr) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));

        try {
            OrderStatus newStatus = OrderStatus.valueOf(statusStr.toUpperCase());

            // Validate status transition
            if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.RETURNED) {
                throw new RuntimeException("Cannot update status of cancelled or returned order");
            }

            // If cancelling, restore product quantities
            if (newStatus == OrderStatus.CANCELLED) {
                for (OrderItem item : order.getOrderItems()) {
                    Product product = item.getProduct();
                    product.setQuantity(product.getQuantity() + item.getQuantity());
                    productRepository.save(product);
                }
            }

            order.setStatus(newStatus);
            Order updatedOrder = orderRepository.save(order);
            return convertToDTO(updatedOrder);

        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid order status: " + statusStr);
        }
    }

    @Transactional
    public void cancelOrder(Long orderId, Long customerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));

        // Check if order belongs to customer
        if (!order.getCustomer().getId().equals(customerId)) {
            throw new RuntimeException("You can only cancel your own orders");
        }

        // Check if order can be cancelled - only PENDING and CONFIRMED
        if (order.getStatus() != OrderStatus.PENDING &&
                order.getStatus() != OrderStatus.CONFIRMED) {
            throw new RuntimeException("Chỉ có thể hủy đơn hàng đang chờ xử lý hoặc đã xác nhận. Trạng thái hiện tại: "
                    + order.getStatus());
        }

        // Restore product quantities
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() + item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }

    @Transactional
    public OrderDTO updateShippingAddress(Long orderId, Long customerId, String newAddress) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));

        // Check if order belongs to customer
        if (!order.getCustomer().getId().equals(customerId)) {
            throw new RuntimeException("You can only update your own orders");
        }

        // Check if order can be updated - only PENDING and CONFIRMED
        if (order.getStatus() != OrderStatus.PENDING &&
                order.getStatus() != OrderStatus.CONFIRMED) {
            throw new RuntimeException(
                    "Chỉ có thể cập nhật địa chỉ khi đơn hàng đang chờ xử lý hoặc đã xác nhận. Trạng thái hiện tại: "
                            + order.getStatus());
        }

        order.setShippingAddress(newAddress);
        Order updatedOrder = orderRepository.save(order);
        return convertToDTO(updatedOrder);
    }

    private OrderDTO convertToDTO(Order order) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setCustomerId(order.getCustomer().getId());
        dto.setCustomerUsername(order.getCustomer().getUsername());
        dto.setCustomerName(order.getCustomerName());
        dto.setCustomerEmail(order.getCustomerEmail());
        dto.setCustomerPhone(order.getCustomerPhone());
        dto.setShippingAddress(order.getShippingAddress());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setStatus(order.getStatus().name());
        dto.setNote(order.getNote());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());

        // Generate VietQR code if payment method is BANK_TRANSFER
        if ("BANK_TRANSFER".equals(order.getPaymentMethod())) {
            String qrCodeUrl = vietQRService.generateQRCode(order.getId(), order.getTotalAmount());
            dto.setQrCodeUrl(qrCodeUrl);
        }

        List<OrderItemDTO> itemDTOs = order.getOrderItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        dto.setOrderItems(itemDTOs);

        return dto;
    }

    private OrderItemDTO convertItemToDTO(OrderItem item) {
        OrderItemDTO dto = new OrderItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct().getId());
        dto.setProductName(item.getProductName());
        dto.setProductPrice(item.getProductPrice());
        dto.setQuantity(item.getQuantity());
        dto.setSubtotal(item.getSubtotal());
        return dto;
    }
}
