# AI Autograder

An AI-assisted grading platform that automates routine evaluation tasks while keeping human graders in control. Built with FastAPI, React, and OpenAI's GPT models.

## Features

- **AI-Powered Grading**: Automated grading using OpenAI's GPT models with rubric-driven consistency
- **LaTeX Support**: Parse and grade LaTeX submissions with question segmentation
- **Human-in-the-Loop**: TAs and instructors can review and override AI grades
- **Async Processing**: Background grading using Celery and Redis
- **Role-Based Access**: Separate interfaces for students, TAs, and instructors
- **Audit Trail**: Complete tracking of grading decisions and modifications

## Architecture

### Backend (FastAPI + Python)
- **API Endpoints**: RESTful API for assignments, submissions, and grades
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT-based auth with role-based permissions
- **File Processing**: LaTeX parsing and content extraction
- **LLM Integration**: OpenAI API with structured grading prompts
- **Async Processing**: Celery workers for background grading tasks

### Frontend (React)
- **Student Interface**: Assignment viewing and submission upload
- **Instructor Interface**: Assignment creation with rubrics and answer keys
- **Grader Interface**: AI grade review and manual override capabilities
- **Responsive Design**: Modern UI built with Tailwind CSS

### Infrastructure
- **Queue System**: Redis for Celery task management
- **File Storage**: Local filesystem (expandable to S3)
- **Containerization**: Docker and Docker Compose for easy deployment

## Quick Start

### Prerequisites
- Docker and Docker Compose OR
- Python 3.8+, Node.js 16+, Redis
- OpenAI API key

### 1. Clone and Setup
```bash
git clone <repository-url>
cd autograder
cp env.example .env
```

### 2. Configure Environment
Edit `.env` file:
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_secret_key_here

# Optional (defaults provided)
DATABASE_URL=postgresql://postgres:password@localhost/autograder_db
REDIS_URL=redis://localhost:6379/0
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Development Setup

### Backend Development

#### Option 1: Local Development (Recommended)
```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis-server

# Install Redis (Windows)
# Download from https://redis.io/download

cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r ../requirements.txt

# Create .env file
cp ../env.example ../.env
# Edit .env with your OpenAI API key

# Run backend
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
cd backend && source venv/bin/activate
celery -A app.services.grading_service worker --loglevel=info
```

#### Option 2: Using Docker
```bash
# Start database and Redis
docker-compose up postgres redis -d

# Follow the rest of Option 1 steps
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Usage Guide

### For Instructors

1. **Create Account**: Register with role "instructor"
2. **Create Assignment**: 
   - Define assignment name and description
   - Set up grading rubric with criteria and point values
   - Provide answer key for each question
3. **Monitor Submissions**: View student submissions and grading progress
4. **Review Grades**: Override AI grades when necessary

### For Students

1. **Create Account**: Register with role "student"
2. **View Assignments**: Browse available assignments
3. **Submit Work**: Upload LaTeX files with structured answers
4. **Check Grades**: View AI feedback and final grades

### For TAs

1. **Create Account**: Register with role "ta"
2. **Review Grades**: Access grading dashboard
3. **Override Scores**: Modify AI grades and provide feedback
4. **Export Results**: Download grades for LMS integration

## Assignment Format

### LaTeX Structure
Students should structure their submissions with clear section headers:

```latex
\documentclass{article}
\begin{document}

\section{Q1}
Your answer to question 1...

\section{Q2}
Your answer to question 2...

\end{document}
```

### Rubric Format
Instructors define rubrics in the web interface:
- Question ID (e.g., "q1", "q2")
- Maximum points per question
- Grading criteria and expectations

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments/{id}` - Get assignment details
- `PUT /api/assignments/{id}` - Update assignment

### Submissions
- `POST /api/submissions/{assignment_id}` - Upload submission
- `GET /api/submissions/assignment/{assignment_id}` - List submissions
- `GET /api/submissions/{id}` - Get submission details

### Grades
- `GET /api/grades/submission/{submission_id}` - Get grades for submission
- `PATCH /api/grades/{id}` - Update grade
- `GET /api/grades/assignment/{assignment_id}/export` - Export grades

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - Required for AI grading
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for Celery
- `SECRET_KEY` - JWT signing key
- `UPLOAD_DIR` - File upload directory

### OpenAI Usage
- Model: GPT-4o-mini (cost-effective)
- Structured prompts with rubric enforcement
- JSON schema validation for consistent responses
- Retry logic for malformed responses

## Deployment

### Production Deployment
1. Set up production environment variables
2. Configure PostgreSQL and Redis instances
3. Deploy using Docker Compose or Kubernetes
4. Set up reverse proxy (nginx) for HTTPS
5. Configure file storage (S3 for scale)

### Scaling Considerations
- Add more Celery workers for concurrent grading
- Use Redis Cluster for high availability
- Implement PostgreSQL read replicas
- Add CDN for static file serving

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Make changes and add tests
4. Commit changes (`git commit -am 'Add new feature'`)
5. Push to branch (`git push origin feature/new-feature`)
6. Create Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

#### File Upload Fails with 500 Error
**Problem**: Redis is not running
**Solution**: 
```bash
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis-server

# Check if Redis is running
redis-cli ping  # Should return "PONG"
```

#### Backend Import Error: "cannot import name 'BaseSettings'"
**Problem**: Missing `pydantic-settings` dependency
**Solution**: 
```bash
pip install pydantic-settings==2.1.0
```

#### Database Connection Error
**Problem**: PostgreSQL not configured or SQLite path issues
**Solution**: Use SQLite for development (default in env.example)
```bash
DATABASE_URL=sqlite:///./autograder.db
```

#### Frontend Heroicons Error
**Problem**: Heroicons v1/v2 version mismatch
**Solution**: Already fixed in package.json, but if you see errors:
```bash
cd frontend
npm install @heroicons/react@^2.0.18
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Check the documentation
3. Search existing issues
4. Create a new issue with detailed description
5. Include logs and error messages

## Roadmap

### Phase 1 (Current)
- ✅ LaTeX submission support
- ✅ AI grading with GPT models
- ✅ Human review interface
- ✅ Basic role-based access

### Phase 2 (Planned)
- [ ] OCR support for handwritten submissions
- [ ] Code submission grading with test harnesses
- [ ] LMS integration (Canvas, Blackboard)
- [ ] Advanced analytics and reporting

### Phase 3 (Future)
- [ ] Multi-language support
- [ ] Plagiarism detection
- [ ] Advanced rubric templates
- [ ] Machine learning grade prediction
