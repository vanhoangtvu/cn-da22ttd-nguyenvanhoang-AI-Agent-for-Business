package com.business.springservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class VietQRService {

    @Value("${vietqr.bank-id}")
    private String bankId;

    @Value("${vietqr.account-no}")
    private String accountNo;

    @Value("${vietqr.account-name}")
    private String accountName;

    @Value("${vietqr.template:compact2}")
    private String template;

    /**
     * Generate VietQR code URL for bank transfer payment
     * 
     * @param orderId Order ID
     * @param amount Total amount to transfer
     * @return VietQR image URL
     */
    public String generateQRCode(Long orderId, BigDecimal amount) {
        try {
            // Format: DH{orderId} - Example: DH123
            String description = "DH" + orderId;
            
            // Encode description for URL
            String encodedDescription = URLEncoder.encode(description, StandardCharsets.UTF_8.toString());
            
            // VietQR API URL format:
            // https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.jpg?amount={AMOUNT}&addInfo={DESCRIPTION}
            String qrUrl = String.format(
                "https://img.vietqr.io/image/%s-%s-%s.jpg?amount=%s&addInfo=%s&accountName=%s",
                bankId,
                accountNo,
                template,
                amount.longValue(), // Convert to long to avoid decimals in URL
                encodedDescription,
                URLEncoder.encode(accountName, StandardCharsets.UTF_8.toString())
            );
            
            return qrUrl;
            
        } catch (UnsupportedEncodingException e) {
            // This should never happen with UTF-8
            throw new RuntimeException("Failed to encode QR code URL", e);
        }
    }

    /**
     * Get bank account information for display
     */
    public String getBankInfo() {
        return String.format("MB Bank - %s - %s", accountNo, accountName);
    }
}
