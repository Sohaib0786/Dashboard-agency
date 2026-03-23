export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_IN_REVIEW' | 'TASK_STATUS_CHANGED' | 'PROJECT_CREATED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isOnline?: boolean;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  managerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  manager?: Pick<User, 'id' | 'name' | 'email'>;
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  project?: Pick<Project, 'id' | 'name'>;
  assignee?: Pick<User, 'id' | 'name' | 'email'>;
  activityLogs?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  projectId: string;
  taskId?: string;
  action: string;
  fromValue?: string;
  toValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: Pick<User, 'id' | 'name'>;
  project?: Pick<Project, 'id' | 'name'>;
  task?: Pick<Task, 'id' | 'title'>;
  formattedMessage?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  taskId?: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  task?: Pick<Task, 'id' | 'title' | 'projectId'>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

export interface AdminDashboard {
  totalProjects: number;
  tasksByStatus: { status: TaskStatus; count: number }[];
  overdueCount: number;
  activeUsersOnline: number;
  recentActivity: ActivityLog[];
}

export interface PmDashboard {
  projects: (Project & { _count: { tasks: number } })[];
  tasksByPriority: { priority: TaskPriority; count: number }[];
  upcomingDueDates: Task[];
}

export interface DevDashboard {
  tasks: Task[];
  tasksByStatus: { status: TaskStatus; count: number }[];
}
