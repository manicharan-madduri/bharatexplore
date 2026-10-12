# Stage 1: Build the Spring Boot application JAR
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache Maven dependencies first
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source and build executable JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal JRE runtime image tuned for Render Free Tier (512 MB RAM)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /app/target/tourism-india-backend-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8082

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS:--Xmx256m -XX:MaxMetaspaceSize=128m -Xss512k -XX:+UseSerialGC} -Dserver.port=${PORT:-8082} -jar app.jar"]
