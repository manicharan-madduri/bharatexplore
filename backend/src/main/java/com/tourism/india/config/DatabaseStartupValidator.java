package com.tourism.india.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;

/**
 * Validates database credential safety, transport security, and Hibernate schema-management
 * settings at application startup.
 *
 * <p>When a production profile ({@code prod} or {@code production}) is active, this validator
 * fails fast if database credentials are missing, if the MySQL {@code root} account is used,
 * if SSL is explicitly disabled in the JDBC URL, or if a destructive/mutable
 * {@code spring.jpa.hibernate.ddl-auto} mode is configured.</p>
 */
@Component
public class DatabaseStartupValidator {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseStartupValidator.class);

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:}")
    private String datasourceUsername;

    @Value("${spring.datasource.password:}")
    private String datasourcePassword;

    @Value("${spring.jpa.hibernate.ddl-auto:validate}")
    private String ddlAuto;

    @Autowired(required = false)
    private Environment environment;

    @PostConstruct
    public void validateConfiguration() {
        boolean isProdProfile = false;
        if (environment != null) {
            isProdProfile = Arrays.stream(environment.getActiveProfiles())
                    .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
        }

        String normalizedDdl = ddlAuto != null ? ddlAuto.trim().toLowerCase(Locale.ROOT) : "";
        if ("create".equals(normalizedDdl) || "create-drop".equals(normalizedDdl)) {
            throw new IllegalStateException(
                    "Destructive spring.jpa.hibernate.ddl-auto mode '" + normalizedDdl +
                    "' is prohibited to protect existing tourism database records."
            );
        }

        if (!isProdProfile) {
            logger.debug("Database configuration validated for local/development profile (ddl-auto={}).", normalizedDdl);
            return;
        }

        if (datasourceUrl == null || datasourceUrl.isBlank()) {
            throw new IllegalStateException(
                    "Production database URL is not configured. Set DB_URL or SPRING_DATASOURCE_URL."
            );
        }

        if (datasourceUsername == null || datasourceUsername.isBlank()) {
            throw new IllegalStateException(
                    "Production database username is not configured. Set DB_USERNAME or SPRING_DATASOURCE_USERNAME."
            );
        }

        if ("root".equalsIgnoreCase(datasourceUsername.trim())) {
            throw new IllegalStateException(
                    "Production profile cannot use the MySQL 'root' account. Configure a dedicated least-privilege database user via DB_USERNAME."
            );
        }

        if (datasourcePassword == null || datasourcePassword.isBlank()) {
            throw new IllegalStateException(
                    "Production database password is not configured. Set DB_PASSWORD or SPRING_DATASOURCE_PASSWORD."
            );
        }

        String lowerUrl = datasourceUrl.toLowerCase(Locale.ROOT);
        if (lowerUrl.contains("usessl=false")) {
            throw new IllegalStateException(
                    "Production database connection must not disable SSL (useSSL=false)."
            );
        }

        if (!"validate".equals(normalizedDdl) && !"none".equals(normalizedDdl)) {
            throw new IllegalStateException(
                    "Production profile requires spring.jpa.hibernate.ddl-auto to be 'validate' or 'none' (found '" + normalizedDdl + "')."
            );
        }

        logger.info("Production database and schema-validation settings verified (ddl-auto={}).", normalizedDdl);
    }
}
