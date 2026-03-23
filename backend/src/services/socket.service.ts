import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Role } from '@prisma/client';
import { verifySocketToken } from '../middleware/auth';
import { ActivityEvent } from '../types';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

interface ConnectedUser {
  userId: string;
  socketId: string;
  role: Role;
  name: string;
  viewingProjectId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>(); // socketId -> user
const userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authenticate every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifySocketToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    (socket as any).user = {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
    };

    next();
  });

  io.on('connection', async (socket) => {
    const user = (socket as any).user as { userId: string; role: Role; name: string };

    logger.info(`Socket connected: ${user.userId} (${user.role})`);

    // Track connection
    const connectedUser: ConnectedUser = {
      userId: user.userId,
      socketId: socket.id,
      role: user.role,
      name: user.name,
    };
    connectedUsers.set(socket.id, connectedUser);

    if (!userSockets.has(user.userId)) {
      userSockets.set(user.userId, new Set());
    }
    userSockets.get(user.userId)!.add(socket.id);

    // Update user online status
    await prisma.user.update({
      where: { id: user.userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    }).catch(() => {});

    // Broadcast online count to admins
    broadcastOnlineCount();

    // User joins their personal room for notifications
    socket.join(`user:${user.userId}`);

    // Handle joining a project room (for live activity feed)
    socket.on('join:project', async (projectId: string) => {
      // Verify access before joining
      const hasAccess = await verifyProjectAccess(user.userId, user.role, projectId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Leave previous project room
      if (connectedUser.viewingProjectId) {
        socket.leave(`project:${connectedUser.viewingProjectId}`);
      }

      socket.join(`project:${projectId}`);
      connectedUser.viewingProjectId = projectId;
      logger.info(`User ${user.userId} joined project room ${projectId}`);

      // Send last 20 missed activity events from DB
      const missedActivity = await getMissedActivity(user.userId, user.role, projectId);
      socket.emit('activity:catchup', missedActivity);
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      if (connectedUser.viewingProjectId === projectId) {
        connectedUser.viewingProjectId = undefined;
      }
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${user.userId}`);
      connectedUsers.delete(socket.id);

      const sockets = userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.userId);
          // User fully offline
          await prisma.user.update({
            where: { id: user.userId },
            data: { isOnline: false, lastSeenAt: new Date() },
          }).catch(() => {});
        }
      }

      broadcastOnlineCount();
    });
  });

  return io;
}

async function verifyProjectAccess(userId: string, role: Role, projectId: string): Promise<boolean> {
  if (role === Role.ADMIN) return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: { select: { assigneeId: true } } },
  });

  if (!project) return false;

  if (role === Role.PROJECT_MANAGER) {
    return project.managerId === userId;
  }

  if (role === Role.DEVELOPER) {
    return project.tasks.some(t => t.assigneeId === userId);
  }

  return false;
}

async function getMissedActivity(userId: string, role: Role, projectId: string) {
  let where: Record<string, unknown> = { projectId };

  if (role === Role.DEVELOPER) {
    where = { projectId, task: { assigneeId: userId } };
  }

  return prisma.activityLog.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });
}

export async function emitActivityEvent(event: ActivityEvent): Promise<void> {
  if (!io) return;

  const payload = {
    ...event,
    formattedMessage: formatActivityMessage(event),
  };

  // Emit to project room (all users viewing this project)
  io.to(`project:${event.projectId}`).emit('activity:new', payload);

  // Emit to admin global feed room
  const adminSockets = getSocketsByRole(Role.ADMIN);
  adminSockets.forEach(socketId => {
    io.to(socketId).emit('activity:global', payload);
  });

  // Emit to PM of this project
  const project = await prisma.project.findUnique({
    where: { id: event.projectId },
    select: { managerId: true },
  });

  if (project) {
    const pmSocketIds = userSockets.get(project.managerId);
    if (pmSocketIds) {
      pmSocketIds.forEach(socketId => {
        io.to(socketId).emit('activity:project', payload);
      });
    }
  }

  // For developer-specific activity, also emit to the task's assignee
  if (event.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: event.taskId },
      select: { assigneeId: true },
    });
    if (task?.assigneeId) {
      const devSocketIds = userSockets.get(task.assigneeId);
      if (devSocketIds) {
        devSocketIds.forEach(socketId => {
          io.to(socketId).emit('activity:task', payload);
        });
      }
    }
  }
}

export function emitNotification(userId: string, notification: Record<string, unknown>): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}

function getSocketsByRole(role: Role): string[] {
  const result: string[] = [];
  connectedUsers.forEach((user, socketId) => {
    if (user.role === role) result.push(socketId);
  });
  return result;
}

function broadcastOnlineCount(): void {
  if (!io) return;
  const count = userSockets.size;
  // Broadcast to all admin sockets
  const adminSockets = getSocketsByRole(Role.ADMIN);
  adminSockets.forEach(socketId => {
    io.to(socketId).emit('presence:count', { count });
  });
}

export function getOnlineUserCount(): number {
  return userSockets.size;
}

function formatActivityMessage(event: ActivityEvent): string {
  const taskRef = event.taskTitle ? `"${event.taskTitle}"` : 'a task';

  switch (event.action) {
    case 'STATUS_CHANGED':
      return `${event.userName} moved ${taskRef} from ${formatStatus(event.fromValue!)} → ${formatStatus(event.toValue!)}`;
    case 'TASK_CREATED':
      return `${event.userName} created task ${taskRef} in ${event.projectName}`;
    case 'TASK_ASSIGNED':
      return `${event.userName} assigned ${taskRef}`;
    default:
      return `${event.userName} updated ${taskRef}`;
  }
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
    OVERDUE: 'Overdue',
  };
  return map[status] || status;
}
