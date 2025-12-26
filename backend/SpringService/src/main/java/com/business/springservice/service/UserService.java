package com.business.springservice.service;

import com.business.springservice.dto.UserDTO;
import com.business.springservice.entity.User;
import com.business.springservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ChromaSyncWebhookService chromaSyncWebhookService;
    
    public List<UserDTO> getAllUsers(String role) {
        System.out.println("getAllUsers called with role: " + role);
        List<User> users = userRepository.findAll();
        System.out.println("Total users in database: " + users.size());
        
        // BUSINESS chỉ xem được CUSTOMER
        if ("BUSINESS".equals(role)) {
            users = users.stream()
                    .filter(user -> user.getRole() == com.business.springservice.enums.Role.CUSTOMER)
                    .collect(Collectors.toList());
            System.out.println("Filtered for BUSINESS - CUSTOMER users only: " + users.size());
        } else {
            System.out.println("ADMIN or other role - showing all users: " + users.size());
        }
        
        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return convertToDTO(user);
    }
    
    @Transactional
    public UserDTO createUser(UserDTO request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setAddress(request.getAddress());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setRole(request.getRole() != null ? request.getRole() : com.business.springservice.enums.Role.CUSTOMER);
        
        User savedUser = userRepository.save(user);
        UserDTO dto = convertToDTO(savedUser);
        
        // Sync to ChromaDB
        chromaSyncWebhookService.syncUser(dto, "INSERT");
        
        return dto;
    }
    
    @Transactional
    public UserDTO updateUser(Long id, UserDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        
        // Only update fields that are provided (not null)
        if (request.getUsername() != null && !request.getUsername().isEmpty()) {
            user.setUsername(request.getUsername());
        }
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            user.setEmail(request.getEmail());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getAccountStatus() != null) {
            user.setAccountStatus(request.getAccountStatus());
        }
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        User updatedUser = userRepository.save(user);
        UserDTO dto = convertToDTO(updatedUser);
        
        // Sync to ChromaDB
        chromaSyncWebhookService.syncUser(dto, "UPDATE");
        
        return dto;
    }
    
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        userRepository.delete(user);
        
        // Sync to ChromaDB
        chromaSyncWebhookService.deleteFromChroma("users", id);
    }
    
    @Transactional
    public void changePassword(Long id, String oldPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Old password is incorrect");
        }
        
        if (newPassword == null || newPassword.isEmpty()) {
            throw new RuntimeException("New password cannot be empty");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    
    @Transactional
    public UserDTO updateAccountStatus(Long id, String statusStr) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        
        try {
            com.business.springservice.enums.AccountStatus status = 
                    com.business.springservice.enums.AccountStatus.valueOf(statusStr.toUpperCase());
            user.setAccountStatus(status);
            User updatedUser = userRepository.save(user);
            return convertToDTO(updatedUser);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid account status: " + statusStr + ". Valid values: ACTIVE, INACTIVE, SUSPENDED, BANNED");
        }
    }
    
    @Transactional
    public UserDTO updateUserRole(Long id, String roleStr) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        
        try {
            com.business.springservice.enums.Role role = 
                    com.business.springservice.enums.Role.valueOf(roleStr.toUpperCase());
            user.setRole(role);
            User updatedUser = userRepository.save(user);
            return convertToDTO(updatedUser);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role: " + roleStr + ". Valid values: ADMIN, BUSINESS, CUSTOMER");
        }
    }
    
    private UserDTO convertToDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                null, // password không trả về
                user.getAddress(),
                user.getPhoneNumber(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getAccountStatus(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
