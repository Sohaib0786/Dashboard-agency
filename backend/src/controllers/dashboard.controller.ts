import { Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { getOnlineUserCount } from '../services/socket.service';

export async function getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;

  if (user!.role === Role.ADMIN) {
    await getAdminDashboard(req, res);
  } else if (user!.role === Role.PROJECT_MANAGER) {
    await getPmDashboard(req, res);
  } else {
    await getDeveloperDashboard(req, res);
  }
}

async function getAdminDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const [
    totalProjects,
    tasksByStatus,
    overdueCount,
    activeUsersOnline,
    recentActivity,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.task.count({ where: { isOverdue: true } }),
    Promise.resolve(getOnlineUserCount()),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    }),
  ]);

  sendSuccess(res, {
    totalProjects,
    tasksByStatus: tasksByStatus.map(t => ({ status: t.status, count: t._count.id })),
    overdueCount,
    activeUsersOnline,
    recentActivity,
  });
}

async function getPmDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;

  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [projects, tasksByPriority, upcomingDueDates] = await Promise.all([
    prisma.project.findMany({
      where: { managerId: user!.id },
      include: {
        _count: { select: { tasks: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { project: { managerId: user!.id } },
      _count: { id: true },
    }),
    prisma.task.findMany({
      where: {
        project: { managerId: user!.id },
        dueDate: { lte: weekFromNow, gte: new Date() },
        status: { notIn: ['DONE'] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ]);

  sendSuccess(res, {
    projects,
    tasksByPriority: tasksByPriority.map(t => ({ priority: t.priority, count: t._count.id })),
    upcomingDueDates,
  });
}

async function getDeveloperDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: user!.id,
      status: { notIn: ['DONE'] },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });

  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where: { assigneeId: user!.id },
    _count: { id: true },
  });

  sendSuccess(res, {
    tasks,
    tasksByStatus: tasksByStatus.map(t => ({ status: t.status, count: t._count.id })),
  });
}
