# Collaborative Code Review Platform API

A comprehensive RESTful API for managing code reviews, submissions, and team collaboration. Built with Express.js, TypeScript, and PostgreSQL, featuring real-time notifications via WebSocket, project analytics, and role-based access control.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [WebSocket Integration](#websocket-integration)
- [Analytics & Statistics](#analytics--statistics)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)
- [Response Format](#response-format)
- [Development Notes](#development-notes)

## Features

- User authentication with JWT and role-based authorization
- Complete CRUD operations for Projects, Submissions, and Comments
- Advanced review workflow with approval/rejection system
- Inline and general code comments with line number support
- Real-time notifications via WebSocket
- Comprehensive project analytics and statistics
- Input validation with express-validator
- Transaction support for data consistency
- Automatic notification creation on reviews

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/tlhololaiza/Collaborative-Code-Review-Platform.git
cd Collaborative-Code-Review-Platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=code_review_platform
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

4. **Create database and run migrations**
```bash
# Create database in pgAdmin: code_review_platform
npm run build
npm run db:migrate
```

5. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Login user | No |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/users/:id` | Get user profile | Yes |
| `PUT` | `/api/users/:id` | Update user profile | Yes (Own profile) |
| `DELETE` | `/api/users/:id` | Delete user | Yes (Own profile or Admin) |
| `GET` | `/api/users/:id/notifications` | Get user notifications | Yes (Own notifications) |
| `PUT` | `/api/users/:id/notifications/:notificationId/read` | Mark notification as read | Yes |
| `PUT` | `/api/users/:id/notifications/read` | Mark all notifications as read | Yes |

### Projects

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/projects` | Create new project | Yes |
| `GET` | `/api/projects` | List user's projects | Yes |
| `GET` | `/api/projects/:id` | Get project details | Yes (Member) |
| `PUT` | `/api/projects/:id` | Update project | Yes (Owner) |
| `DELETE` | `/api/projects/:id` | Delete project | Yes (Owner) |
| `POST` | `/api/projects/:id/members` | Add project member | Yes (Owner) |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove project member | Yes (Owner) |
| `GET` | `/api/projects/:id/submissions` | List project submissions | Yes (Member) |
| `GET` | `/api/projects/:id/stats` | Get project statistics | Yes (Member) |

### Submissions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/submissions` | Create code submission | Yes |
| `GET` | `/api/submissions/:id` | Get submission details | Yes (Member) |
| `PUT` | `/api/submissions/:id/status` | Update submission status | Yes (Reviewer) |
| `DELETE` | `/api/submissions/:id` | Delete submission | Yes (Submitter or Owner) |
| `POST` | `/api/submissions/:id/approve` | Approve submission | Yes (Reviewer, not submitter) |
| `POST` | `/api/submissions/:id/request-changes` | Request changes | Yes (Reviewer, not submitter) |
| `GET` | `/api/submissions/:id/reviews` | Get review history | Yes (Member) |
| `POST` | `/api/submissions/:id/comments` | Add comment | Yes (Reviewer) |
| `GET` | `/api/submissions/:id/comments` | List comments | Yes (Member) |

### Comments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `PUT` | `/api/comments/:id` | Update comment | Yes (Comment owner) |
| `DELETE` | `/api/comments/:id` | Delete comment | Yes (Comment owner or Project owner) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health check with database status |
| `GET` | `/api` | API information and endpoints list |

## Data Models

### User

```typescript
interface User {
  id: string;              // UUID
  email: string;           // Required, unique
  password_hash: string;   // Hashed with bcrypt
  name: string;            // Required
  display_picture?: string; // Optional URL
  role: 'submitter' | 'reviewer' | 'admin';
  created_at: Date;
  updated_at: Date;
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 6 characters
- `name`: Minimum 2 characters
- `role`: Must be 'submitter' or 'reviewer' (on registration)

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "reviewer@example.com",
  "name": "Alice Reviewer",
  "display_picture": "https://example.com/avatar.jpg",
  "role": "reviewer",
  "created_at": "2025-10-01T10:00:00Z"
}
```

### Project

```typescript
interface Project {
  id: string;              // UUID
  name: string;            // Required, min 3 chars
  description?: string;    // Optional
  owner_id: string;        // UUID, references User
  created_at: Date;
  updated_at: Date;
}
```

**Validation Rules:**
- `name`: Required, minimum 3 characters
- `description`: Optional text

**Example:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Frontend Redesign",
  "description": "Complete UI/UX overhaul of the dashboard",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-10-01T11:00:00Z"
}
```

### Submission

```typescript
interface Submission {
  id: string;              // UUID
  project_id: string;      // UUID, references Project
  submitter_id: string;    // UUID, references User
  title: string;           // Required, 3-255 chars
  description?: string;    // Optional
  code_content: string;    // Required
  file_name?: string;      // Optional
  language?: string;       // Optional
  status: 'pending' | 'in_review' | 'approved' | 'changes_requested';
  created_at: Date;
  updated_at: Date;
}
```

**Validation Rules:**
- `project_id`: Must reference existing project with access
- `title`: Required, 3-255 characters
- `code_content`: Required, cannot be empty
- `status`: Automatically set to 'pending' on creation

**Example:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "project_id": "660e8400-e29b-41d4-a716-446655440001",
  "submitter_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix login button alignment",
  "description": "The login button on mobile devices is misaligned",
  "code_content": "function handleLogin() {...}",
  "file_name": "LoginButton.jsx",
  "language": "javascript",
  "status": "pending",
  "created_at": "2025-10-02T09:00:00Z"
}
```

### Comment

```typescript
interface Comment {
  id: string;              // UUID
  submission_id: string;   // UUID, references Submission
  user_id: string;         // UUID, references User
  content: string;         // Required, 1-2000 chars
  line_number?: number;    // Optional, for inline comments
  is_resolved: boolean;    // Default false
  created_at: Date;
  updated_at: Date;
}
```

**Validation Rules:**
- `content`: Required, 1-2000 characters
- `line_number`: Optional, positive integer
- Only reviewers can comment (not submitters)

**Example:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "submission_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Consider adding error handling here",
  "line_number": 15,
  "is_resolved": false,
  "created_at": "2025-10-02T10:30:00Z"
}
```

### Review

```typescript
interface Review {
  id: string;              // UUID
  submission_id: string;   // UUID, references Submission
  reviewer_id: string;     // UUID, references User
  action: 'approved' | 'changes_requested';
  comment?: string;        // Required for changes_requested
  created_at: Date;
}
```

**Business Rules:**
- Reviewer cannot review their own submission
- `comment` required when requesting changes
- Updates submission status automatically
- Creates notification for submitter

### Notification

```typescript
interface Notification {
  id: string;              // UUID
  user_id: string;         // UUID, references User
  type: string;            // e.g., 'review', 'comment'
  title: string;           // Notification title
  message: string;         // Notification message
  related_id?: string;     // UUID of related resource
  is_read: boolean;        // Default false
  created_at: Date;
}
```

**Types:**
- `review`: Review-related notifications
- `comment`: Comment-related notifications
- Other custom types as needed

## WebSocket Integration

### Connection

Connect to WebSocket for real-time notifications:
```
ws://localhost:3000/ws?token=YOUR_JWT_TOKEN
```

### Authentication
- JWT token required in query parameter
- Connection rejected if token invalid/missing
- User ID extracted from token for targeting

### Features
- Real-time notification delivery
- Heartbeat mechanism (30-second intervals)
- Automatic reconnection handling
- Echo support for testing

### Message Types

**Connected:**
```json
{
  "type": "connected",
  "message": "Successfully connected to notification stream",
  "userId": "user-id"
}
```

**Notification:**
```json
{
  "type": "notification",
  "data": {
    "id": "notification-id",
    "type": "review",
    "title": "Submission Approved",
    "message": "Your submission has been approved",
    "related_id": "submission-id",
    "created_at": "2025-10-02T15:00:00Z"
  }
}
```

**Echo (Testing):**
```json
{
  "type": "echo",
  "data": { /* your message */ }
}
```

### Client Example

```javascript
// Browser/Node.js
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to notification stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  if (data.type === 'notification') {
    // Handle notification
    console.log('New notification:', data.data);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Analytics & Statistics

### Project Statistics

Access via `GET /api/projects/:id/stats`

**Metrics Provided:**
- Total submissions count
- Submissions by status breakdown
- Approval rate percentage
- Average review time (hours)
- Most active reviewers with review counts
- Most commented submission
- Recent submissions (last 10)

**Example Response:**
```json
{
  "stats": {
    "total_submissions": 15,
    "submissions_by_status": {
      "pending": 3,
      "in_review": 2,
      "approved": 8,
      "changes_requested": 2
    },
    "approval_rate": "80.00%",
    "avg_review_time_hours": "4.25",
    "most_active_reviewers": [
      {
        "id": "user-id",
        "name": "Alice Reviewer",
        "email": "alice@example.com",
        "review_count": "12"
      }
    ],
    "most_commented_submission": {
      "id": "submission-id",
      "title": "Refactor authentication flow",
      "comment_count": "8",
      "submitter_name": "Bob Developer"
    },
    "recent_submissions": [
      {
        "id": "submission-id",
        "title": "Update API endpoints",
        "status": "approved",
        "created_at": "2025-10-02T14:00:00Z",
        "submitter_name": "John Developer"
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error description"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

### Common Error Scenarios

**Validation Error (400):**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Forbidden (403):**
```json
{
  "error": "Forbidden",
  "message": "You can only update your own profile"
}
```

**Not Found (404):**
```json
{
  "error": "Not Found",
  "message": "Project not found or access denied"
}
```

## Usage Examples

### Register and Login

```bash
# Register new user
POST /api/auth/register
Content-Type: application/json

{
  "email": "reviewer@example.com",
  "password": "password123",
  "name": "Alice Reviewer",
  "role": "reviewer"
}

# Response includes JWT token
{
  "message": "User registered successfully",
  "user": {
    "id": "user-id",
    "email": "reviewer@example.com",
    "name": "Alice Reviewer",
    "role": "reviewer",
    "created_at": "2025-10-01T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "reviewer@example.com",
  "password": "password123"
}
```

### Create Project and Add Members

```bash
# Create project
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Frontend Redesign",
  "description": "Complete UI/UX overhaul"
}

# Add team member
POST /api/projects/{project-id}/members
Authorization: Bearer {owner-token}
Content-Type: application/json

{
  "userId": "team-member-user-id"
}
```

### Submit Code for Review

```bash
POST /api/submissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": "project-uuid",
  "title": "Fix login button alignment",
  "description": "Mobile alignment issue fix",
  "code_content": "function handleLogin() {\n  return <button>Login</button>\n}",
  "file_name": "LoginButton.jsx",
  "language": "javascript"
}
```

### Add Comments and Review

```bash
# Add inline comment
POST /api/submissions/{submission-id}/comments
Authorization: Bearer {reviewer-token}
Content-Type: application/json

{
  "content": "Consider adding error handling here",
  "line_number": 15
}

# Approve submission
POST /api/submissions/{submission-id}/approve
Authorization: Bearer {reviewer-token}
Content-Type: application/json

{
  "comment": "Excellent work! Code is clean and well-documented."
}

# Request changes
POST /api/submissions/{submission-id}/request-changes
Authorization: Bearer {reviewer-token}
Content-Type: application/json

{
  "comment": "Please add error handling and update variable names"
}
```

### Get Notifications and Statistics

```bash
# Get user notifications
GET /api/users/{user-id}/notifications
Authorization: Bearer {token}

# Response
{
  "notifications": [
    {
      "id": "notification-id",
      "type": "review",
      "title": "Submission Approved",
      "message": "Your submission has been approved: Excellent work!",
      "related_id": "submission-id",
      "is_read": false,
      "created_at": "2025-10-02T15:00:00Z"
    }
  ],
  "unread_count": 2
}

# Mark all as read
PUT /api/users/{user-id}/notifications/read
Authorization: Bearer {token}

# Get project statistics
GET /api/projects/{project-id}/stats
Authorization: Bearer {token}
```

## Response Format

### Success Response

```json
{
  "message": "Operation completed successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "reviewer"
  },
  "token": "jwt-token"
}
```

### Project with Members

```json
{
  "project": {
    "id": "project-id",
    "name": "Project Name",
    "description": "Project description",
    "owner_id": "owner-id",
    "owner_name": "Owner Name",
    "owner_email": "owner@example.com",
    "created_at": "2025-10-01T10:00:00Z",
    "members": [
      {
        "id": "member-id",
        "name": "Member Name",
        "email": "member@example.com",
        "user_role": "reviewer",
        "project_role": "reviewer",
        "joined_at": "2025-10-01T11:00:00Z"
      }
    ]
  }
}
```

### Review History Response

```json
{
  "reviews": [
    {
      "id": "review-id",
      "submission_id": "submission-id",
      "reviewer_id": "reviewer-id",
      "action": "changes_requested",
      "comment": "Please add error handling",
      "reviewer_name": "Alice Reviewer",
      "reviewer_email": "alice@example.com",
      "created_at": "2025-10-03T10:30:00Z"
    },
    {
      "id": "review-id-2",
      "submission_id": "submission-id",
      "reviewer_id": "reviewer-id-2",
      "action": "approved",
      "comment": "Looks good!",
      "reviewer_name": "Bob Reviewer",
      "reviewer_email": "bob@example.com",
      "created_at": "2025-10-02T15:20:00Z"
    }
  ]
}
```

## Development Notes

### Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Real-time**: WebSocket (ws library)
- **Validation**: express-validator
- **CORS**: cors middleware

### Architecture
- **Modular design** with separation of concerns
- **Type-safe** throughout with TypeScript
- **RESTful** API design principles
- **Transaction support** for data consistency
- **Middleware pipeline** for request processing

### Database Schema
- **7 tables**: users, projects, project_members, submissions, comments, reviews, notifications
- **Foreign key constraints** for data integrity
- **Cascade deletes** for cleanup
- **Indexes** for query performance
- **Triggers** for updated_at timestamps

### Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Route controllers (business logic)
├── database/        # Database migrations and schema
├── middleware/      # Authentication and validation middleware
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (auth helpers)
├── websocket/       # WebSocket handlers
└── server.ts        # Application entry point
```

### Key Features Implementation

**Authentication Flow:**
1. User registers/logs in
2. Server generates JWT token
3. Client includes token in Authorization header
4. Middleware verifies token on protected routes

**Review Workflow:**
1. Submitter creates submission
2. Reviewers add comments
3. Reviewer approves or requests changes
4. Status updated automatically
5. Notification sent to submitter

**Real-time Notifications:**
1. Client connects via WebSocket with JWT token
2. Server verifies and stores connection
3. When events occur, server pushes notifications
4. Client receives and displays notifications

---

**API Version**: 1.0.0  
**Node.js Version**: 18+ required  
**PostgreSQL Version**: 12+ recommended  
**TypeScript**: Required for development  

**Repository**: [GitHub](https://github.com/tlhololaiza/Collaborative-Code-Review-Platform)  
**License**: ISC
