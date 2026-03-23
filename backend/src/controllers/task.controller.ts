import { Response } from 'express';
import { Role, TaskStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { AuthenticatedRequest, TaskFilters } from '../types';
import { emitActivityEvent, emitNotification } from '../services/socket.service';

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;
  const filters: TaskFilters = {
    status: req.query.status ? (req.query.status as string).split(',') : undefined,
    priority: req.query.priority ? (req.query.priority as string).split(',') : undefined,
    dueDateFrom: req.query.dueDateFrom as string,
    dueDateTo: req.query.dueDateTo as string,
    projectId: req.query.projectId as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const skip = ((filters.page || 1) - 1) * (filters.limit || 20);

  // Build where clause based on role
  let where: Record<string, unknown> = {};

  if (user!.role === Role.DEVELOPER) {
    where.assigneeId = user!.id;
  } else if (user!.role === Role.PROJECT_MANAGER) {
    where.project = { managerId: user!.id };
  }

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }
  if (filters.priority?.length) {
    where.priority = { in: filters.priority };
  }
  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {
      ...(filters.dueDateFrom && { gte: new Date(filters.dueDateFrom) }),
      ...(filters.dueDateTo && { lte: new Date(filters.dueDateTo) }),
    };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: filters.limit,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    }),
    prisma.task.count({ where }),
  ]);

  sendPaginated(res, tasks, total, filters.page || 1, filters.limit || 20);
}

export async function getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      assignee: { select: { id: true, name: true, email: true } },
      activityLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!task) {
    sendError(res, 'Task not found', 404);
    return;
  }

  // Role-based access
  if (user!.role === Role.DEVELOPER && task.assigneeId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }
  if (user!.role === Role.PROJECT_MANAGER && (task.project as { managerId: string }).managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  sendSuccess(res, task);
}

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { title, description, projectId, assigneeId, priority, dueDate } = req.body;
  const { user } = req;

  // Verify PM owns this project
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    sendError(res, 'Project not found', 404);
    return;
  }

  if (user!.role === Role.PROJECT_MANAGER && project.managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Log activity
  const activityLog = await prisma.activityLog.create({
    data: {
      userId: user!.id,
      projectId,
      taskId: task.id,
      action: 'TASK_CREATED',
      toValue: title,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Emit real-time activity
  await emitActivityEvent({
    id: activityLog.id,
    userId: user!.id,
    userName: user!.name,
    projectId,
    projectName: project.name,
    taskId: task.id,
    taskTitle: task.title,
    action: 'TASK_CREATED',
    toValue: title,
    createdAt: activityLog.createdAt,
  });

  // Send notification to assigned developer
  if (assigneeId) {
    const notification = await prisma.notification.create({
      data: {
        recipientId: assigneeId,
        taskId: task.id,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task "${title}" in ${project.name}`,
      },
    });
    emitNotification(assigneeId, notification);
  }

  sendSuccess(res, task, 201);
}

export async function updateTaskStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;
  const { user } = req;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    sendError(res, 'Task not found', 404);
    return;
  }

  // Developers can only update their own tasks
  if (user!.role === Role.DEVELOPER && task.assigneeId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  // PM can only update tasks in their projects
  if (user!.role === Role.PROJECT_MANAGER && (task.project as { managerId: string }).managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const fromStatus = task.status;

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { status: status as TaskStatus },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Record status change in DB (NOT derived)
  const activityLog = await prisma.activityLog.create({
    data: {
      userId: user!.id,
      projectId: task.projectId,
      taskId: task.id,
      action: 'STATUS_CHANGED',
      fromValue: fromStatus,
      toValue: status,
    },
  });

  // Emit real-time activity event
  await emitActivityEvent({
    id: activityLog.id,
    userId: user!.id,
    userName: user!.name,
    projectId: task.projectId,
    projectName: (task.project as { name: string }).name,
    taskId: task.id,
    taskTitle: task.title,
    action: 'STATUS_CHANGED',
    fromValue: fromStatus,
    toValue: status,
    createdAt: activityLog.createdAt,
  });

  // Notify PM when task moves to IN_REVIEW
  if (status === TaskStatus.IN_REVIEW && task.project) {
    const managerId = (task.project as { managerId: string }).managerId;
    const notification = await prisma.notification.create({
      data: {
        recipientId: managerId,
        taskId: task.id,
        type: 'TASK_IN_REVIEW',
        message: `Task "${task.title}" is ready for review in ${(task.project as { name: string }).name}`,
      },
    });
    emitNotification(managerId, notification);
  }

  sendSuccess(res, updatedTask);
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { select: { managerId: true, name: true } } },
  });

  if (!task) {
    sendError(res, 'Task not found', 404);
    return;
  }

  if (user!.role === Role.DEVELOPER) {
    sendError(res, 'Developers can only update task status', 403);
    return;
  }

  if (user!.role === Role.PROJECT_MANAGER && (task.project as { managerId: string }).managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const { title, description, assigneeId, priority, dueDate } = req.body;
  const prevAssigneeId = task.assigneeId;

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      assigneeId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify new assignee if changed
  if (assigneeId && assigneeId !== prevAssigneeId) {
    const notification = await prisma.notification.create({
      data: {
        recipientId: assigneeId,
        taskId: task.id,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task "${title || task.title}" in ${(task.project as { name: string }).name}`,
      },
    });
    emitNotification(assigneeId, notification);
  }

  sendSuccess(res, updatedTask);
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { select: { managerId: true } } },
  });

  if (!task) {
    sendError(res, 'Task not found', 404);
    return;
  }

  if (user!.role === Role.PROJECT_MANAGER && (task.project as { managerId: string }).managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await prisma.task.delete({ where: { id } });
  sendSuccess(res, null, 200, 'Task deleted');
}

export async function getTaskActivityLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { select: { managerId: true } } },
  });

  if (!task) {
    sendError(res, 'Task not found', 404);
    return;
  }

  if (user!.role === Role.DEVELOPER && task.assigneeId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  if (user!.role === Role.PROJECT_MANAGER && (task.project as { managerId: string }).managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const logs = await prisma.activityLog.findMany({
    where: { taskId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, logs);
}
