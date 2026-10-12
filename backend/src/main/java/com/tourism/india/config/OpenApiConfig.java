package com.tourism.india.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Tourism India Discovery API")
                        .version("1.0.0")
                        .description("REST API for exploring India's 36 States & Union Territories, top 15 destinations per state, photo galleries, and verified official tourism visitation rankings.")
                        .contact(new Contact()
                                .name("Tourism India Engineering Team")
                                .url("https://tourism.gov.in"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
