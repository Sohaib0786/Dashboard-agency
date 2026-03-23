import { Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function getActivityFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;
  const limit = parseInt(req.query.limit as string) || 20;
  const projectId = req.query.projectId as string;

  let where: Record<string, unknown> = {};

  if (user!.role === Role.DEVELOPER) {
    // Developer: only activity on their tasks
    where = {
      task: {
        assigneeId: user!.id,
      },
    };
  } else if (user!.role === Role.PROJECT_MANAGER) {
    // PM: only activity from their projects
    where = {
      project: {
        managerId: user!.id,
      },
    };
  }

  // Filter by specific project if requested
  if (projectId) {
    where.projectId = projectId;
  }

  const activities = await prisma.activityLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });

  sendSuccess(res, activities);
}
