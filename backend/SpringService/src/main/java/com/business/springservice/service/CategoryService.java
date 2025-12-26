package com.business.springservice.service;

import com.business.springservice.dto.CategoryDTO;
import com.business.springservice.entity.Category;
import com.business.springservice.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {
    
    private final CategoryRepository categoryRepository;
    private final com.business.springservice.repository.ProductRepository productRepository;
    
    public List<CategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<CategoryDTO> getAllActiveCategories() {
        return categoryRepository.findAll().stream()
                .filter(category -> category.getStatus() == com.business.springservice.enums.Status.ACTIVE)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        return convertToDTO(category);
    }
    
    @Transactional
    public CategoryDTO createCategory(CategoryDTO request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new RuntimeException("Category name already exists");
        }
        
        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        
        Category savedCategory = categoryRepository.save(category);
        return convertToDTO(savedCategory);
    }
    
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryDTO request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        
        if (request.getName() != null && !request.getName().isEmpty()) {
            category.setName(request.getName());
        }
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        if (request.getImageUrl() != null) {
            category.setImageUrl(request.getImageUrl());
        }
        
        Category updatedCategory = categoryRepository.save(category);
        return convertToDTO(updatedCategory);
    }
    
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        categoryRepository.delete(category);
    }
    
    @Transactional
    public CategoryDTO updateCategoryStatus(Long id, String statusStr) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        
        try {
            com.business.springservice.enums.Status status = com.business.springservice.enums.Status.valueOf(statusStr.toUpperCase());
            category.setStatus(status);
            Category updatedCategory = categoryRepository.save(category);
            return convertToDTO(updatedCategory);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status value. Must be ACTIVE or INACTIVE");
        }
    }
    
    private CategoryDTO convertToDTO(Category category) {
        // Count number of products in this category
        long productCount = productRepository.findByCategoryId(category.getId()).size();
        
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setImageUrl(category.getImageUrl());
        dto.setStatus(category.getStatus().name());
        dto.setProductCount(productCount);
        
        return dto;
    }
}
