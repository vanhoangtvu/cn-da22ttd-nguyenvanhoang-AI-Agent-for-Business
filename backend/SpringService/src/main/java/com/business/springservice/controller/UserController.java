package com.business.springservice.controller;

import com.business.springservice.dto.UserDTO;
import com.business.springservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "APIs for managing users (ADMIN and BUSINESS only)")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current user info", description = "Get information of currently logged-in user from JWT token")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved current user"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT token")
    })
    public ResponseEntity<UserDTO> getCurrentUser(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @GetMapping
    @Operation(summary = "Get all users", description = "Retrieve a list of all users. Requires ADMIN or BUSINESS role. BUSINESS only sees CUSTOMER users.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT token"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<List<UserDTO>> getAllUsers(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        return ResponseEntity.ok(userService.getAllUsers(role));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID", description = "Retrieve user details by ID. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<UserDTO> getUserById(
            @Parameter(description = "ID of user to retrieve") @PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @Operation(summary = "Create new user", description = "Create a new user. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input or user already exists"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(userDTO));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update user", description = "Update user information. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<UserDTO> updateUser(
            @Parameter(description = "ID of user to update") @PathVariable Long id,
            @RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.updateUser(id, userDTO));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update account status", description = "Update user account status (ACTIVE, INACTIVE, SUSPENDED, BANNED). Only ADMIN or BUSINESS role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Account status updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid status value"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<UserDTO> updateAccountStatus(
            @Parameter(description = "ID of user") @PathVariable Long id,
            @RequestParam @Parameter(description = "Status: ACTIVE, INACTIVE, SUSPENDED, BANNED") String status) {
        return ResponseEntity.ok(userService.updateAccountStatus(id, status));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Update user role", description = "Update user role (ADMIN, BUSINESS, CUSTOMER). Only ADMIN can use this.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid role value"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN allowed")
    })
    public ResponseEntity<UserDTO> updateUserRole(
            HttpServletRequest request,
            @Parameter(description = "ID of user") @PathVariable Long id,
            @RequestParam @Parameter(description = "Role: ADMIN, BUSINESS, CUSTOMER") String role) {
        String currentRole = (String) request.getAttribute("role");
        if (!"ADMIN".equals(currentRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user", description = "Delete a user by their ID. Requires ADMIN or BUSINESS role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "User deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied. Only ADMIN and BUSINESS roles allowed")
    })
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "ID of user to delete") @PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
