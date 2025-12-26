package com.business.springservice.dto;

import com.business.springservice.enums.AccountStatus;
import com.business.springservice.enums.Role;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "User ID")
    private Long id;
    
    @Schema(description = "Username", example = "john_doe")
    private String username;
    
    @Schema(description = "Full name", example = "Nguyễn Văn A")
    private String fullName;
    
    @Schema(description = "Email address", example = "john@example.com")
    private String email;
    
    @Schema(description = "Password", example = "password123")
    private String password;
    
    @Schema(description = "Address", example = "123 Main Street")
    private String address;
    
    @Schema(description = "Phone number", example = "0123456789")
    private String phoneNumber;
    
    @Schema(description = "Avatar URL", example = "https://example.com/avatar.jpg")
    private String avatarUrl;
    
    @Schema(description = "User role", example = "CUSTOMER")
    private Role role;
    
    @Schema(description = "Account status", example = "ACTIVE")
    private AccountStatus accountStatus;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Created timestamp")
    private LocalDateTime createdAt;
    
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "Updated timestamp")
    private LocalDateTime updatedAt;
}
