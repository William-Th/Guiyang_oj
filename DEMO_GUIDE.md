# 贵阳市小学生测评平台 - Demo Guide

## Quick Start

### 1. Start the Application
```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps
```

### 2. Access the Application
- **Frontend**: http://localhost:3000 (through Nginx proxy: http://localhost:80)
- **Backend API**: http://localhost:3001
- **Database Admin**: http://localhost:5050 (pgAdmin)

## Demo Accounts

All demo accounts use the password: **`password123`**

### Student Accounts
| Role | Login (ID Card) | Password | Name |
|------|----------------|----------|------|
| Student | `520102200801011234` | `password123` | 张小明 |
| Student | `520102200802012345` | `password123` | 李小红 |
| Student | `520102200803013456` | `password123` | 王小刚 |

### Teacher Accounts
| Role | Username | Password | Name |
|------|----------|----------|------|
| Teacher | `teacher01` | `password123` | 李老师 |
| Teacher | `teacher02` | `password123` | 王老师 |

### Admin Account
| Role | Username | Password | Name |
|------|----------|----------|------|
| Admin | `admin` | `password123` | 系统管理员 |

## Demo Workflow

### For Students

1. **Login**
   - Go to http://localhost:3000
   - Click "学生入口" tab
   - Enter ID card: `520102200801011234`
   - Enter password: `password123`
   - Click "登录"

2. **Browse Available Exams**
   - Navigate to "考试中心" from the menu
   - View published exams:
     - 2024年春季语文期中考试 (Published)
     - 2024年春季数学期中考试 (Published)  
     - 2024年春季科学测验 (Ongoing)

3. **Register for an Exam**
   - Click "报名" on any published exam
   - Confirm registration

4. **Take an Exam**
   - Click "开始考试" on a registered exam
   - Answer the questions:
     - **Language Exam**: Multiple choice questions about Chinese language
     - **Math Exam**: Basic arithmetic and geometry questions
     - **Science Exam**: Questions about plants and animals
   - Submit answers when complete

5. **View Results**
   - Navigate to "成绩查询" to see exam results
   - View scores and performance charts

### For Teachers

1. **Login**
   - Click "教师入口" tab
   - Enter username: `teacher01`
   - Enter password: `password123`

2. **Create New Exams**
   - Access admin features (if authorized)
   - Create new exams with questions

3. **Monitor Student Progress**
   - View student registrations
   - Monitor exam submissions
   - Review results

### For Admins

1. **Login**
   - Use admin credentials
   - Access full administrative dashboard

2. **System Management**
   - Manage users and schools
   - Monitor system performance
   - View audit logs

## Available Exam Content

### 语文期中考试 (Language Exam)
- Question 1: Character pronunciation (单选)
- Question 2: Classical poetry (单选)  
- Question 3: Spring-related vocabulary (多选)

### 数学期中考试 (Math Exam)
- Question 1: Basic addition (3 + 5)
- Question 2: Word problem (apples)
- Question 3: Geometry (square perimeter)

### 科学测验 (Science Exam)
- Question 1: Plant growth requirements
- Question 2: Mammal identification

## API Testing

You can also test the API directly:

```bash
# Login as student
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "520102200801011234",
    "password": "password123", 
    "loginType": "idCard"
  }'

# Get available exams (requires token)
curl -X GET http://localhost:3001/api/exams \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   docker-compose logs postgres
   ```

2. **Frontend Not Loading**
   ```bash
   docker-compose logs frontend
   docker-compose logs nginx
   ```

3. **API Errors**
   ```bash
   docker-compose logs backend
   ```

### Reset Database
```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm guiyang_oj_postgres_data

# Restart (will recreate database with seed data)
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

## Database Access

**pgAdmin Access:**
- URL: http://localhost:5050
- Email: admin@guiyang.edu
- Password: admin123

**Direct Database Connection:**
- Host: localhost
- Port: 5432
- Database: guiyang_oj
- Username: postgres
- Password: postgres123

## Security Features Implemented

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Student/Teacher/Admin)
- Secure password hashing with bcrypt

✅ **Environment Security**
- All secrets moved to environment variables
- Cryptographically secure JWT secrets generated
- No hardcoded credentials in source code

✅ **API Security**
- Input validation on all endpoints
- SQL injection protection with parameterized queries
- CORS configuration for frontend access

## Architecture Overview

- **Frontend**: React + TypeScript + Ant Design
- **Backend**: Node.js + Express + PostgreSQL
- **Database**: PostgreSQL with Redis caching
- **Deployment**: Docker + Docker Compose + Nginx
- **Authentication**: JWT tokens with refresh mechanism

Enjoy exploring the platform! 🎓