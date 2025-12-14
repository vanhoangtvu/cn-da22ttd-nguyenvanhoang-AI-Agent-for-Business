package com.business.springservice.controller;

import com.business.springservice.dto.BusinessDocumentDTO;
import com.business.springservice.service.BusinessDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/admin/business-documents")
@RequiredArgsConstructor
@Tag(name = "Business Documents", description = "APIs for business document management (ADMIN and BUSINESS only)")
public class BusinessDocumentController {
    
    private final BusinessDocumentService documentService;
    
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload business document", description = "Upload business document (PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG). Max size 10MB.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Document uploaded successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid file type or size"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<BusinessDocumentDTO> uploadDocument(
            HttpServletRequest request,
            @RequestParam("file") @Parameter(description = "Document file", required = true) MultipartFile file,
            @RequestParam(value = "description", required = false) @Parameter(description = "Document description") String description) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadDocument(file, businessId, description));
    }
    
    @GetMapping("/my-documents")
    @Operation(summary = "Get my documents", description = "Get all documents uploaded by current business user")
    public ResponseEntity<List<BusinessDocumentDTO>> getMyDocuments(HttpServletRequest request) {
        Long businessId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(documentService.getDocumentsByBusiness(businessId));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get document by ID", description = "Get document details by ID")
    public ResponseEntity<BusinessDocumentDTO> getDocumentById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentById(id));
    }
    
    @GetMapping("/business/{businessId}")
    @Operation(summary = "Get documents by business", description = "Get all documents from a specific business (Admin only)")
    public ResponseEntity<List<BusinessDocumentDTO>> getDocumentsByBusiness(@PathVariable Long businessId) {
        return ResponseEntity.ok(documentService.getDocumentsByBusiness(businessId));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete document", description = "Delete a document. Only document owner can delete.")
    public ResponseEntity<Void> deleteDocument(
            HttpServletRequest request,
            @PathVariable Long id) {
        Long businessId = (Long) request.getAttribute("userId");
        documentService.deleteDocument(id, businessId);
        return ResponseEntity.noContent().build();
    }
}
