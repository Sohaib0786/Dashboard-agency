import { Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  let where: Record<string, unknown> = {};

  if (user!.role === Role.PROJECT_MANAGER) {
    where = { managerId: user!.id };
  } else if (user!.role === Role.DEVELOPER) {
    // Developers only see projects they have tasks in
    where = {
      tasks: {
        some: { assigneeId: user!.id },
      },
    };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: { select: { id: true, name: true, company: true } },
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  sendPaginated(res, projects, total, page, limit);
}

export async function getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      },
    },
  });

  if (!project) {
    sendError(res, 'Project not found', 404);
    return;
  }

  // Role-based access: PM can only see their own projects
  if (user!.role === Role.PROJECT_MANAGER && project.managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  // Developer can only see projects they have assigned tasks in
  if (user!.role === Role.DEVELOPER) {
    const hasTask = project.tasks.some(t => t.assigneeId === user!.id);
    if (!hasTask) {
      sendError(res, 'Access denied', 403);
      return;
    }
    // Filter tasks to only show developer's own tasks
    project.tasks = project.tasks.filter(t => t.assigneeId === user!.id);
  }

  sendSuccess(res, project);
}

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, description, clientId } = req.body;
  const { user } = req;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    sendError(res, 'Client not found', 404);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      clientId,
      managerId: user!.id,
    },
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  sendSuccess(res, project, 201);
}

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    sendError(res, 'Project not found', 404);
    return;
  }

  // PM can only edit their own projects, Admin can edit any
  if (user!.role === Role.PROJECT_MANAGER && project.managerId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const { name, description, isActive } = req.body;

  const updated = await prisma.project.update({
    where: { id },
    data: { name, description, isActive },
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  sendSuccess(res, updated);
}

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    sendError(res, 'Project not found', 404);
    return;
  }

  await prisma.project.delete({ where: { id } });
  sendSuccess(res, null, 200, 'Project deleted');
}
