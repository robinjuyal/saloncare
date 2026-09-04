# SalonQueue Backend

A comprehensive salon booking and queue management platform built with Spring Boot.

## Features

- 🔐 JWT-based authentication
- 💈 Real-time queue management
- 📱 WebSocket support for live updates
- 🏪 Salon management
- 📅 Online booking system
- 👥 Walk-in customer management
- ⭐ Reviews and ratings
- 📊 Analytics dashboard

## Tech Stack

- **Framework**: Spring Boot 3.2.2
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT
- **Real-time**: WebSocket (STOMP)
- **ORM**: Spring Data JPA
- **Build Tool**: Maven
- **Java Version**: 17+

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- PostgreSQL 12+

## Setup Instructions

### 1. Database Setup

```sql
CREATE DATABASE salonqueue_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE salonqueue_db TO postgres;
```

### 2. Configuration

Update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/salonqueue_db
spring.datasource.username=postgres
spring.datasource.password=your_password
```

### 3. Build & Run

```bash
# Build
mvn clean install

# Run
mvn spring-boot:run
```

Server will start on `http://localhost:8080`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login

### Queue Management
- `GET /api/queue/salon/{salonId}` - Get current queue
- `POST /api/queue/walkin` - Add walk-in customer
- `POST /api/queue/{id}/start` - Start service
- `POST /api/queue/{id}/complete` - Complete service
- `DELETE /api/queue/{id}` - Remove from queue

### Salons
- `GET /api/salons/search/nearby` - Find nearby salons
- `GET /api/salons/{id}` - Get salon details
- `POST /api/salons` - Create salon (Owner)
- `PUT /api/salons/{id}` - Update salon (Owner)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/customer` - Get user bookings
- `GET /api/bookings/{id}` - Get booking details

## WebSocket

Connect to: `ws://localhost:8080/ws`

Subscribe to salon queue updates:
```javascript
stompClient.subscribe('/topic/queue/' + salonId, callback);
```

## Project Structure

```
src/main/java/com/salonqueue/
├── config/          # Configuration classes
├── controller/      # REST Controllers
├── dto/            # Data Transfer Objects
├── entity/         # JPA Entities
├── repository/     # Data repositories
├── security/       # Security configuration
├── service/        # Business logic
└── websocket/      # WebSocket handlers
```

## Database Schema

Main entities:
- **User** - System users (customers, owners, barbers)
- **Salon** - Salon information
- **Service** - Services offered by salons
- **Booking** - Online bookings
- **QueueEntry** - Queue management
- **Review** - Customer reviews

## Development

```bash
# Run tests
mvn test

# Package
mvn package

# Skip tests
mvn package -DskipTests
```

## Production Deployment

1. Update production configuration
2. Build: `mvn clean package -DskipTests`
3. Run: `java -jar target/salonqueue-backend-1.0.0.jar`

## License

Proprietary - All Rights Reserved

## Support

For issues, please contact the development team.
