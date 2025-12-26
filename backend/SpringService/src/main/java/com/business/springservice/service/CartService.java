package com.business.springservice.service;

import com.business.springservice.dto.CartDTO;
import com.business.springservice.dto.CartItemDTO;
import com.business.springservice.entity.Cart;
import com.business.springservice.entity.CartItem;
import com.business.springservice.entity.Product;
import com.business.springservice.entity.User;
import com.business.springservice.repository.CartItemRepository;
import com.business.springservice.repository.CartRepository;
import com.business.springservice.repository.ProductRepository;
import com.business.springservice.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {
    
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ChromaSyncWebhookService chromaSyncWebhookService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Transactional(readOnly = true)
    public CartDTO getCart(Long userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // Create cart if doesn't exist
                    Cart newCart = new Cart();
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    newCart.setUser(user);
                    return cartRepository.save(newCart);
                });
        
        return convertToDTO(cart);
    }
    
    @Transactional
    public CartDTO addToCart(Long userId, Long productId, Integer quantity) {
        if (quantity <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }
        
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        if (product.getQuantity() < quantity) {
            throw new RuntimeException("Not enough product in stock");
        }
        
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    newCart.setUser(user);
                    return cartRepository.save(newCart);
                });
        
        // Check if product already in cart
        CartItem existingItem = cartItemRepository.findByCartIdAndProductId(cart.getId(), productId)
                .orElse(null);
        
        if (existingItem != null) {
            // Update quantity
            int newQuantity = existingItem.getQuantity() + quantity;
            if (product.getQuantity() < newQuantity) {
                throw new RuntimeException("Not enough product in stock");
            }
            existingItem.setQuantity(newQuantity);
            cartItemRepository.save(existingItem);
        } else {
            // Add new item
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProduct(product);
            newItem.setQuantity(quantity);
            cartItemRepository.save(newItem);
        }
        
        CartDTO dto = convertToDTO(cartRepository.findById(cart.getId()).get());
        
        // Sync to ChromaDB
        chromaSyncWebhookService.syncCart(dto, "UPDATE");
        
        return dto;
    }
    
    @Transactional
    public CartDTO updateCartItem(Long userId, Long itemId, Integer quantity) {
        if (quantity <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }
        
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
        
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));
        
        if (!item.getCart().getId().equals(cart.getId())) {
            throw new RuntimeException("Cart item does not belong to this user");
        }
        
        if (item.getProduct().getQuantity() < quantity) {
            throw new RuntimeException("Not enough product in stock");
        }
        
        item.setQuantity(quantity);
        cartItemRepository.save(item);
        
        CartDTO dto = convertToDTO(cartRepository.findById(cart.getId()).get());
        
        // Sync to ChromaDB
        chromaSyncWebhookService.syncCart(dto, "UPDATE");
        
        return dto;
    }
    
    @Transactional
    public CartDTO removeCartItem(Long userId, Long itemId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
        
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));
        
        if (!item.getCart().getId().equals(cart.getId())) {
            throw new RuntimeException("Cart item does not belong to this user");
        }
        
        cartItemRepository.delete(item);
        
        CartDTO dto = convertToDTO(cartRepository.findById(cart.getId()).get());
        
        // Sync to ChromaDB
        chromaSyncWebhookService.syncCart(dto, "UPDATE");
        
        return dto;
    }
    
    @Transactional
    public void clearCart(Long userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
        
        cartItemRepository.deleteByCartId(cart.getId());
        
        // Sync empty cart to ChromaDB
        CartDTO emptyCart = getCart(userId);
        chromaSyncWebhookService.syncCart(emptyCart, "UPDATE");
    }
    
    private CartDTO convertToDTO(Cart cart) {
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        
        List<CartItemDTO> itemDTOs = items.stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        
        BigDecimal totalPrice = itemDTOs.stream()
                .map(CartItemDTO::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        CartDTO dto = new CartDTO();
        dto.setId(cart.getId());
        dto.setUserId(cart.getUser().getId());
        dto.setItems(itemDTOs);
        dto.setTotalPrice(totalPrice);
        dto.setCreatedAt(cart.getCreatedAt());
        dto.setUpdatedAt(cart.getUpdatedAt());
        
        return dto;
    }
    
    private CartItemDTO convertItemToDTO(CartItem item) {
        Product product = item.getProduct();
        BigDecimal subtotal = product.getPrice().multiply(new BigDecimal(item.getQuantity()));
        
        // Get first image URL
        String imageUrl = null;
        try {
            List<String> images = objectMapper.readValue(
                product.getImageUrls(), 
                new TypeReference<List<String>>() {}
            );
            if (!images.isEmpty()) {
                imageUrl = images.get(0);
            }
        } catch (Exception e) {
            // Ignore error
        }
        
        CartItemDTO dto = new CartItemDTO();
        dto.setId(item.getId());
        dto.setProductId(product.getId());
        dto.setProductName(product.getName());
        dto.setProductPrice(product.getPrice());
        dto.setProductImageUrl(imageUrl);
        dto.setQuantity(item.getQuantity());
        dto.setSubtotal(subtotal);
        dto.setAddedAt(item.getAddedAt());
        
        return dto;
    }
}
