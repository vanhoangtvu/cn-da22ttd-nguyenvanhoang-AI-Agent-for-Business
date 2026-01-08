package com.business.springservice.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

        @Bean
        public OpenAPI customOpenAPI() {
                Server localServer = new Server();
                localServer.setUrl(System.getenv().getOrDefault("SPRING_SERVICE_URL", "http://localhost:8089/api/v1"));
                localServer.setDescription("Production Server");

                Server relativeServer = new Server();
                relativeServer.setUrl("/api/v1");
                relativeServer.setDescription("Current Server (works with any IP)");

                Contact contact = new Contact();
                contact.setEmail("contact@business.com");
                contact.setName("Business Support");

                License license = new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html");

                Info info = new Info()
                                .title("Spring Service API")
                                .version("1.0.0")
                                .contact(contact)
                                .description("API documentation for Spring Service application")
                                .license(license);

                // Configure JWT Bearer authentication
                SecurityScheme securityScheme = new SecurityScheme()
                                .name("Bearer Authentication")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                                .description("Enter JWT token (without 'Bearer' prefix)");

                SecurityRequirement securityRequirement = new SecurityRequirement()
                                .addList("Bearer Authentication");

                return new OpenAPI()
                                .info(info)
                                .servers(List.of(relativeServer, localServer))
                                .components(new Components().addSecuritySchemes("Bearer Authentication",
                                                securityScheme))
                                .addSecurityItem(securityRequirement);
        }
}
