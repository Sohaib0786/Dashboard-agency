import { Role } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  projectId?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export interface SocketUser {
  userId: string;
  socketId: string;
  role: Role;
  projectIds?: string[];
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  action: string;
  fromValue?: string;
  toValue?: string;
  createdAt: Date;
}
