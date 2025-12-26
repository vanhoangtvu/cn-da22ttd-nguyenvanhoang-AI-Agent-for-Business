package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {
    @Schema(description = "Username", example = "john_doe")
    private String username;
    
    @Schema(description = "Full name", example = "Nguyễn Văn A")
    private String fullName;
    
    @Schema(description = "Email address", example = "john@example.com")
    private String email;
    
    @Schema(description = "Address", example = "123 Main Street")
    private String address;
    
    @Schema(description = "Phone number", example = "0123456789")
    private String phoneNumber;
    
    @Schema(description = "Avatar URL", example = "https://example.com/avatar.jpg")
    private String avatarUrl;
}
