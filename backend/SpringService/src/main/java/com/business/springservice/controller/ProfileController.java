package com.business.springservice.controller;

import com.business.springservice.dto.ProfileUpdateRequest;
import com.business.springservice.dto.UserDTO;
import com.business.springservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "APIs for managing own profile (All authenticated users)")
public class ProfileController {

    private final UserService userService;

    @GetMapping
    @Operation(
        summary = "Get current user profile", 
        description = "Get your own profile. All authenticated users can access."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing token")
    })
    public ResponseEntity<UserDTO> getCurrentProfile(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @PatchMapping
    @Operation(
        summary = "Update own profile", 
        description = "Update your own profile information. " +
                     "**Only send the fields you want to change** - other fields will remain unchanged. " +
                     "Example: To update only email, send: {\"email\":\"newemail@example.com\"}"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<UserDTO> updateProfile(
            HttpServletRequest request,
            @Parameter(description = "Fields to update (only send fields you want to change)") @RequestBody ProfileUpdateRequest profileRequest) {
        Long userId = (Long) request.getAttribute("userId");
        
        // Convert ProfileUpdateRequest to UserDTO
        UserDTO userDTO = new UserDTO();
        userDTO.setUsername(profileRequest.getUsername());
        userDTO.setFullName(profileRequest.getFullName());
        userDTO.setEmail(profileRequest.getEmail());
        userDTO.setAddress(profileRequest.getAddress());
        userDTO.setPhoneNumber(profileRequest.getPhoneNumber());
        userDTO.setAvatarUrl(profileRequest.getAvatarUrl());
        
        return ResponseEntity.ok(userService.updateUser(userId, userDTO));
    }

    @PatchMapping("/password")
    @Operation(
        summary = "Change own password", 
        description = "Change your own password. All authenticated users can change their password."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password changed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized or old password incorrect"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<String> changePassword(
            HttpServletRequest request,
            @RequestBody PasswordChangeRequest passwordRequest) {
        Long userId = (Long) request.getAttribute("userId");
        userService.changePassword(userId, passwordRequest.getOldPassword(), passwordRequest.getNewPassword());
        return ResponseEntity.ok("Password changed successfully");
    }
}
