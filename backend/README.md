# StellarSplit Backend

NestJS backend for StellarSplit - a crypto-powered bill splitting application.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database credentials and configuration.

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Start the application:**

   ```bash
   # Development with live reload
   npm run dev:watch

   # Or production build
   npm run start
   ```

The API will be available at `http://localhost:3000`

## 🔐 Authentication

The backend supports both JWT-based authentication and a development bypass.
For detailed information on headers and local testing, see the [Authentication Guide](../docs/AUTHENTICATION.md).

## 📚 API Documentation

Once the application is running, visit:

- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api-docs

## 📁 Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root application module
├── config/                # Configuration modules
│   ├── app.config.ts      # Application configuration
│   └── database.config.ts # Database configuration
├── database/              # Database configuration and utilities
│   └── typeorm.config.ts  # TypeORM configuration
└── modules/               # Feature modules
    └── health/            # Health check module
        ├── health.controller.ts
        ├── health.service.ts
        └── health.module.ts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=stellarsplit_dev
DB_SYNCHRONIZE=true
DB_LOGGING=false

# Swagger
SWAGGER_PATH=/api/docs
SWAGGER_TITLE=StellarSplit API
SWAGGER_DESCRIPTION=API for StellarSplit - Split bills instantly with crypto
SWAGGER_VERSION=1.0.0
```

## 🏥 Health Check Endpoint

**GET** `/health`

Returns the API health status:

```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "uptime": 123.456
}
```

## 📦 Dependencies

### Core

- `@nestjs/core` - NestJS core framework
- `@nestjs/common` - Common NestJS utilities
- `reflect-metadata` - Metadata reflection API
- `rxjs` - Reactive programming library

### Database

- `@nestjs/typeorm` - TypeORM integration for NestJS
- `typeorm` - ORM for database management
- `pg` - PostgreSQL driver

### Configuration

- `@nestjs/config` - Configuration management
- `dotenv` - Environment variable loading

### Validation & Transformation

- `class-validator` - Data validation decorators
- `class-transformer` - DTO transformation

### API Documentation

- `@nestjs/swagger` - Swagger/OpenAPI integration

### Development

- `typescript` - TypeScript compiler
- `ts-node` - Execute TypeScript directly
- `nodemon` - Auto-reload on file changes

## 📋 Available Scripts

- `npm run build` - Build the project for production
- `npm run start` - Run the built application
- `npm run dev` - Run the application in development mode
- `npm run dev:watch` - Run with auto-reload on file changes
- `npm test` - Run tests (not yet configured)

## 🗄️ Database Setup

The application uses PostgreSQL with TypeORM. On first run with `DB_SYNCHRONIZE=true`, the database schema will be automatically created.

### Connect to PostgreSQL

```bash
# If running PostgreSQL locally
psql -U postgres -d stellarsplit_dev
```

## 🚦 Acceptance Criteria Status

✅ NestJS project initialized  
✅ TypeORM connected to PostgreSQL  
✅ Environment variables loaded  
✅ Health check endpoint returns 200  
✅ Swagger API docs configured  
✅ Backend starts without errors

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📝 License

See [LICENSE](../../LICENSE) for licensing information.

![CI](https://github.com/OlufunbiIK/StellarSplit/actions/workflows/ci.yml/badge.svg)
![Deploy Backend](https://github.com/OlufunbiIK/StellarSplit/actions/workflows/deploy-backend.yml/badge.svg)
![Deploy Frontend](https://github.com/OlufunbiIK/StellarSplit/actions/workflows/deploy-frontend.yml/badge.svg)
