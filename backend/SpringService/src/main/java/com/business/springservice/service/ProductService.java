package com.business.springservice.service;

import com.business.springservice.dto.ProductCreateRequest;
import com.business.springservice.dto.ProductDTO;
import com.business.springservice.dto.ProductDetailsDTO;
import com.business.springservice.entity.Category;
import com.business.springservice.entity.Product;
import com.business.springservice.entity.User;
import com.business.springservice.repository.CategoryRepository;
import com.business.springservice.repository.ProductRepository;
import com.business.springservice.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Transactional(readOnly = true)
    public List<ProductDTO> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> getAllActiveProducts() {
        return productRepository.findAll().stream()
                .filter(product -> product.getStatus() == com.business.springservice.enums.Status.ACTIVE 
                        && product.getCategory().getStatus() == com.business.springservice.enums.Status.ACTIVE)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        return convertToDTO(product);
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> getActiveProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId).stream()
                .filter(product -> product.getStatus() == com.business.springservice.enums.Status.ACTIVE 
                        && product.getCategory().getStatus() == com.business.springservice.enums.Status.ACTIVE)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsBySeller(Long sellerId) {
        return productRepository.findBySellerId(sellerId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> searchProducts(String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductDTO> searchActiveProducts(String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword).stream()
                .filter(product -> product.getStatus() == com.business.springservice.enums.Status.ACTIVE 
                        && product.getCategory().getStatus() == com.business.springservice.enums.Status.ACTIVE)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public ProductDTO createProduct(ProductCreateRequest request, Long sellerId) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));
        
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new RuntimeException("Seller not found"));
        
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setQuantity(request.getQuantity());
        product.setImageUrls(convertListToJson(request.getImageUrls()));
        product.setDetails(request.getDetails());
        product.setCategory(category);
        product.setSeller(seller);
        
        Product savedProduct = productRepository.save(product);
        return convertToDTO(savedProduct);
    }
    
    @Transactional
    public ProductDTO updateProduct(Long id, ProductCreateRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        
        if (request.getName() != null && !request.getName().isEmpty()) {
            product.setName(request.getName());
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            product.setPrice(request.getPrice());
        }
        if (request.getQuantity() != null) {
            product.setQuantity(request.getQuantity());
        }
        if (request.getImageUrls() != null) {
            product.setImageUrls(convertListToJson(request.getImageUrls()));
        }
        if (request.getDetails() != null) {
            product.setDetails(request.getDetails());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(category);
        }
        
        Product updatedProduct = productRepository.save(product);
        return convertToDTO(updatedProduct);
    }
    
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        productRepository.delete(product);
    }
    
    @Transactional
    public ProductDTO updateProductStatus(Long id, String statusStr) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        
        try {
            com.business.springservice.enums.Status status = com.business.springservice.enums.Status.valueOf(statusStr.toUpperCase());
            product.setStatus(status);
            Product updatedProduct = productRepository.save(product);
            return convertToDTO(updatedProduct);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status value. Must be ACTIVE or INACTIVE");
        }
    }
    
    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setQuantity(product.getQuantity());
        dto.setImageUrls(convertJsonToList(product.getImageUrls()));
        dto.setStatus(product.getStatus().name());
        dto.setCategoryId(product.getCategory().getId());
        dto.setCategoryName(product.getCategory().getName());
        dto.setSellerId(product.getSeller().getId());
        dto.setSellerUsername(product.getSeller().getUsername());
        dto.setDetails(product.getDetails());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        return dto;
    }
    
    private String convertListToJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
    
    private List<String> convertJsonToList(String json) {
        if (json == null || json.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>(){});
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }
    
    // Helper: Convert ProductDetailsDTO to JSON string
    public String convertDetailsToJson(ProductDetailsDTO details) {
        if (details == null) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
    
    // Helper: Convert details JSON string to ProductDetailsDTO
    public ProductDetailsDTO convertJsonToDetails(String json) {
        if (json == null || json.isEmpty()) {
            return new ProductDetailsDTO();
        }
        try {
            return objectMapper.readValue(json, ProductDetailsDTO.class);
        } catch (JsonProcessingException e) {
            return new ProductDetailsDTO();
        }
    }
}
