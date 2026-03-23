import { Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: user!.id,
      ...(unreadOnly && { isRead: false }),
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { task: { select: { id: true, title: true, projectId: true } } },
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: user!.id, isRead: false },
  });

  sendSuccess(res, { notifications, unreadCount });
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user } = req;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    sendError(res, 'Notification not found', 404);
    return;
  }

  if (notification.recipientId !== user!.id) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  sendSuccess(res, null, 200, 'Marked as read');
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { user } = req;

  await prisma.notification.updateMany({
    where: { recipientId: user!.id, isRead: false },
    data: { isRead: true },
  });

  sendSuccess(res, null, 200, 'All notifications marked as read');
}
