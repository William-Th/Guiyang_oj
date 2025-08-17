# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker Development (Recommended)
```bash
# Start all services
docker-compose up -d

# Stop all services  
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild and start
docker-compose up -d --build
```

### Backend Development
```bash
cd backend
npm install
npm run dev         # Development server with nodemon
npm run start       # Production server
npm test            # Run Jest tests
npm run lint        # ESLint code checking
npm run migrate     # Database migrations
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev         # Vite development server
npm run build       # TypeScript compilation + Vite build
npm run preview     # Preview production build
npm run lint        # ESLint with TypeScript
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj

# Import schema and seed data (auto-imported on first run)
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql

# Reset database
docker-compose down
docker volume rm guiyang_oj_postgres_data
docker-compose up -d
```

## Architecture Overview

### System Components
- **Frontend**: React 18 + TypeScript + Ant Design 5 + Redux Toolkit + Vite
- **Backend**: Node.js + Express.js + PostgreSQL + Redis + JWT authentication
- **Database**: PostgreSQL 15 with comprehensive schema for users, exams, questions, answers
- **Deployment**: Docker containers orchestrated with Docker Compose + Nginx reverse proxy
- **Security**: Helmet.js, rate limiting, CORS, bcrypt password hashing, JWT tokens

### Application Structure
```
guiyang_oj/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── routes/    # API endpoints: auth, users, exams, questions, results
│   │   ├── controllers/
│   │   ├── models/    # Database models: User, Exam, StudentExam, Answer
│   │   ├── middleware/# auth.js for JWT authentication
│   │   ├── services/  # Business logic layer
│   │   ├── utils/     # jwt.js, logger.js utilities
│   │   └── server.js  # Express app configuration
├── frontend/          # React TypeScript SPA
│   ├── src/
│   │   ├── components/# Reusable UI components
│   │   ├── pages/     # Route-based page components
│   │   ├── store/     # Redux slices: authSlice, examSlice
│   │   ├── services/  # API service layer
│   │   └── utils/     # Frontend utilities
├── database/          # SQL schema and seed data
├── nginx/             # Reverse proxy configuration
└── docker-compose.yml # Multi-container orchestration
```

### Key Design Patterns
- **Backend**: RESTful API with Express.js routes, middleware-based authentication, PostgreSQL with parameterized queries for security
- **Frontend**: React functional components with hooks, Redux Toolkit for state management, Ant Design for consistent UI
- **Database**: Normalized schema with proper foreign keys, indexes, and audit logging
- **Authentication**: JWT-based with role-based access control (student/teacher/admin)

### Service Ports
- Frontend: http://localhost:3000 (Vite dev) or http://localhost:80 (Nginx)
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:5050

### Role-Based Access
- **Students**: Login with ID card number, take exams, view results
- **Teachers**: Manage exams and questions, view student progress
- **Admin**: Full system access, user management, system configuration

### Demo Accounts
All demo accounts use password: `password123`
- Student: `520102200801011234` (ID card login)
- Teacher: `teacher01`
- Admin: `admin`

## Development Guidelines

### API Endpoints Structure
- `/api/auth/*` - Authentication (login, logout, token refresh)
- `/api/exams/*` - Exam management (CRUD, registration, submission)
- `/api/questions/*` - Question bank management
- `/api/results/*` - Results and statistics
- `/api/users/*` - User management

### Database Schema Key Tables
- `users` - All user accounts with role-based access
- `exams` - Exam definitions with timing and scoring
- `questions` - Question bank with multiple types (single, multiple, blank, essay, code)
- `student_exams` - Student registration and exam attempts
- `answers` - Individual question responses with scoring
- `schools`, `students`, `teachers` - Extended user profile data

### Security Implementation
- Environment variables for all secrets (JWT_SECRET, DB credentials)
- Helmet.js for security headers and CSP
- Rate limiting on API endpoints
- CORS configured for frontend access
- Input validation with express-validator
- SQL injection protection via parameterized queries
- Password hashing with bcryptjs

### State Management
- Redux Toolkit with slices for auth and exam state
- Persistent login state across browser sessions
- API response caching in Redux store
- Error handling and loading states

This is a comprehensive online testing platform for elementary students in Guiyang, designed for scalability and security with proper role-based access controls.
- document file (markdown) should always try to write in Chinese except file names and terminologies
- @PROGRESS.md is the development process so far. @MVP_Plan.md is the overall implementation plan
- when finish the implementation we should update @PROGRESS.md