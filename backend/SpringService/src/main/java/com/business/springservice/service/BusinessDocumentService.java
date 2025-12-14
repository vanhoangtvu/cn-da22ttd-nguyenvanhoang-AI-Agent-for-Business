package com.business.springservice.service;

import com.business.springservice.dto.BusinessDocumentDTO;
import com.business.springservice.entity.BusinessDocument;
import com.business.springservice.entity.User;
import com.business.springservice.repository.BusinessDocumentRepository;
import com.business.springservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BusinessDocumentService {
    
    private final BusinessDocumentRepository documentRepository;
    private final UserRepository userRepository;
    
    @Value("${file.upload-dir:uploads/documents}")
    private String uploadDir;
    
    @Transactional
    public BusinessDocumentDTO uploadDocument(MultipartFile file, Long businessId, String description) {
        // Validate business user exists
        User business = userRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business user not found"));
        
        // Validate file
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }
        
        // Validate file type (PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG)
        String contentType = file.getContentType();
        if (contentType == null || !isValidFileType(contentType)) {
            throw new RuntimeException("Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG are allowed");
        }
        
        // Validate file size (max 10MB)
        long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.getSize() > maxSize) {
            throw new RuntimeException("File size exceeds maximum limit of 10MB");
        }
        
        try {
            // Create upload directory if not exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename != null ? 
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            
            // Save file to disk
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Save document metadata to database
            BusinessDocument document = new BusinessDocument();
            document.setBusiness(business);
            document.setFileName(originalFilename);
            document.setFileType(contentType);
            document.setFilePath(uploadDir + "/" + uniqueFilename);
            document.setFileSize(file.getSize());
            document.setDescription(description);
            
            BusinessDocument savedDocument = documentRepository.save(document);
            return convertToDTO(savedDocument);
            
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file: " + e.getMessage());
        }
    }
    
    @Transactional(readOnly = true)
    public List<BusinessDocumentDTO> getDocumentsByBusiness(Long businessId) {
        return documentRepository.findByBusinessIdOrderByUploadedAtDesc(businessId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public BusinessDocumentDTO getDocumentById(Long id) {
        BusinessDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));
        return convertToDTO(document);
    }
    
    @Transactional
    public void deleteDocument(Long id, Long businessId) {
        BusinessDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));
        
        // Check if document belongs to business
        if (!document.getBusiness().getId().equals(businessId)) {
            throw new RuntimeException("You can only delete your own documents");
        }
        
        // Delete file from disk
        try {
            Path filePath = Paths.get(document.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log error but continue with database deletion
            System.err.println("Failed to delete file from disk: " + e.getMessage());
        }
        
        // Delete from database
        documentRepository.delete(document);
    }
    
    private boolean isValidFileType(String contentType) {
        return contentType.equals("application/pdf") ||
               contentType.equals("application/msword") ||
               contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
               contentType.equals("application/vnd.ms-excel") ||
               contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
               contentType.equals("text/csv") ||
               contentType.equals("image/jpeg") ||
               contentType.equals("image/jpg") ||
               contentType.equals("image/png");
    }
    
    private BusinessDocumentDTO convertToDTO(BusinessDocument document) {
        BusinessDocumentDTO dto = new BusinessDocumentDTO();
        dto.setId(document.getId());
        dto.setBusinessId(document.getBusiness().getId());
        dto.setBusinessUsername(document.getBusiness().getUsername());
        dto.setFileName(document.getFileName());
        dto.setFileType(document.getFileType());
        dto.setFilePath(document.getFilePath());
        dto.setFileSize(document.getFileSize());
        dto.setDescription(document.getDescription());
        dto.setUploadedAt(document.getUploadedAt());
        return dto;
    }
}
