package com.business.springservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Service to send webhooks to Python service for ChromaDB synchronization
 * Triggers real-time sync when MySQL data changes
 */
@Service
public class ChromaSyncWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(ChromaSyncWebhookService.class);

    @Value("${python.service.url:http://localhost:5000}")
    private String pythonServiceUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ChromaSyncWebhookService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Send sync webhook asynchronously to avoid blocking main operation
     */
    @Async
    public void sendSyncWebhook(String table, String operation, Object data) {
        try {
            String webhookUrl = pythonServiceUrl + "/api/sync/webhook";
            
            // Prepare webhook payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("table", table);
            payload.put("operation", operation); // INSERT, UPDATE, DELETE
            payload.put("data", data);
            payload.put("timestamp", java.time.Instant.now().toString());

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            // Send webhook
            ResponseEntity<String> response = restTemplate.postForEntity(
                webhookUrl,
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("[CHROMA SYNC] Webhook sent successfully: {} {} - {}", 
                    operation, table, response.getBody());
            } else {
                logger.warn("[CHROMA SYNC] Webhook failed: {} {} - Status: {}", 
                    operation, table, response.getStatusCode());
            }

        } catch (Exception e) {
            logger.error("[CHROMA SYNC] Error sending webhook for {} {}: {}", 
                operation, table, e.getMessage());
            // Don't throw - webhook failure shouldn't break main operation
        }
    }

    /**
     * Sync product to ChromaDB
     */
    public void syncProduct(Object product, String operation) {
        sendSyncWebhook("products", operation, product);
    }

    /**
     * Sync user to ChromaDB
     */
    public void syncUser(Object user, String operation) {
        sendSyncWebhook("users", operation, user);
    }

    /**
     * Sync cart to ChromaDB
     */
    public void syncCart(Object cart, String operation) {
        sendSyncWebhook("carts", operation, cart);
    }

    /**
     * Sync order to ChromaDB
     */
    public void syncOrder(Object order, String operation) {
        sendSyncWebhook("orders", operation, order);
    }

    /**
     * Sync discount to ChromaDB
     */
    public void syncDiscount(Object discount, String operation) {
        sendSyncWebhook("discounts", operation, discount);
    }

    /**
     * Delete from ChromaDB
     */
    public void deleteFromChroma(String table, Long id) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        sendSyncWebhook(table, "DELETE", data);
    }
}
