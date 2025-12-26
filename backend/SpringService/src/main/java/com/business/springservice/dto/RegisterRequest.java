package com.business.springservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @Schema(description = "Username", example = "john_doe", required = true)
    private String username;
    
    @Schema(description = "Full name", example = "Nguyễn Văn A")
    private String fullName;
    
    @Schema(description = "Email address", example = "john@example.com", required = true)
    private String email;
    
    @Schema(description = "Password", example = "password123", required = true)
    private String password;
}
