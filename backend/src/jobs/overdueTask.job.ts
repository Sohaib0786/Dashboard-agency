import cron from 'node-cron';
import prisma from '../utils/prisma';
import logger from '../utils/logger';



export function startOverdueTaskJob(): void {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    logger.info('Running overdue task check...');
    try {
      const result = await prisma.task.updateMany({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'OVERDUE'] },
          isOverdue: false,
        },
        data: { isOverdue: true },
      });

      if (result.count > 0) {
        logger.info(`Flagged ${result.count} tasks as overdue`);

        // Log activity for each newly overdue task
        const overdueTasks = await prisma.task.findMany({
          where: {
            isOverdue: true,
            dueDate: { lt: new Date() },
            status: { notIn: ['DONE'] },
          },
          select: { id: true, projectId: true, title: true },
          take: 100,
        });

        const systemUserId = await getSystemUserId();
        if (systemUserId) {
          await prisma.activityLog.createMany({
            data: overdueTasks.map(task => ({
              userId: systemUserId,
              projectId: task.projectId,
              taskId: task.id,
              action: 'TASK_OVERDUE',
              toValue: 'OVERDUE',
              metadata: { automated: true },
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch (err) {
      logger.error('Overdue task job failed', { error: err });
    }
  });

  logger.info('Overdue task scheduler started (runs every hour)');
}

async function getSystemUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  return admin?.id ?? null;
}
