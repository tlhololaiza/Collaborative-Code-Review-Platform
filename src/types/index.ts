import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  display_picture?: string;
  role: 'submitter' | 'reviewer' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  display_picture?: string;
  role: string;
  created_at: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'submitter' | 'reviewer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export interface Submission {
  id: string;
  project_id: string;
  submitter_id: string;
  title: string;
  description?: string;
  code_content: string;
  file_name?: string;
  language?: string;
  status: 'pending' | 'in_review' | 'approved' | 'changes_requested';
  created_at: Date;
  updated_at: Date;
}

export interface CreateSubmissionRequest {
  project_id: string;
  title: string;
  description?: string;
  code_content: string;
  file_name?: string;
  language?: string;
}