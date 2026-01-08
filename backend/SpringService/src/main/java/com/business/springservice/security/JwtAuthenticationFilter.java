package com.business.springservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // IMPORTANT: Skip authentication for OPTIONS requests FIRST (CORS preflight)
        if ("OPTIONS".equals(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            filterChain.doFilter(request, response);
            return;
        }
        
        String path = request.getRequestURI();
        
        // Skip authentication for login, register, swagger
        if (path.contains("/auth/") || path.contains("/swagger") || path.contains("/api-docs") || 
            path.contains("/users") && "POST".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Check profile, cart, admin, orders and users endpoints
        if (path.contains("/profile") || path.contains("/cart") || path.contains("/admin") || 
            path.contains("/orders") || (path.contains("/users") && !"POST".equals(request.getMethod()))) {
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Missing or invalid Authorization header\"}");
                return;
            }
            
            String token = authHeader.substring(7);
            
            if (!jwtUtil.isTokenValid(token)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Invalid or expired token\"}");
                return;
            }
            
            // Add user info to request attributes
            Long userId = jwtUtil.extractUserId(token);
            String username = jwtUtil.extractUsername(token);
            String role = jwtUtil.extractRole(token);
            
            request.setAttribute("userId", userId);
            request.setAttribute("username", username);
            request.setAttribute("role", role);
            request.setAttribute("userRole", role); // For backward compatibility with controllers using "userRole"
        }
        
        filterChain.doFilter(request, response);
    }
}
