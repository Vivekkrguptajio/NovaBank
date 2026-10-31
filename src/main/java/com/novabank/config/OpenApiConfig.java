package com.novabank.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI at http://localhost:8080/swagger-ui.html with an "Authorize" button for the JWT. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI novaBankOpenApi() {
        return new OpenAPI()
                .info(new Info().title("NovaBank API").version("1.0")
                        .description("Bank Management System - accounts, transactions, loans, admin"))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }
}
