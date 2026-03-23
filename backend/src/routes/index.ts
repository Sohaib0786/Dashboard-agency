import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/errorHandler';
import * as authController from '../controllers/auth.controller';
import * as projectController from '../controllers/project.controller';
import * as taskController from '../controllers/task.controller';
import * as activityController from '../controllers/activity.controller';
import * as notificationController from '../controllers/notification.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import * as userController from '../controllers/user.controller';
import { Role } from '@prisma/client';

const router = Router();

// ─── AUTH ──────────────────────────────────────────────────────────────
router.post('/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validateRequest,
  authController.login
);
router.post('/auth/refresh',
   authController.refresh
  );
router.post(
  '/auth/logout', 
    authenticate,
   authController.logout
  );
router.get('/auth/me', 
             authenticate, 
             authController.getMe
            );


// ─── DASHBOARD ───────────────────────────────────────────────────────────────
router.get( '/dashboard', 
             authenticate, 
              dashboardController.getDashboard
             );

// ─── USERS ───────────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize(Role.ADMIN), userController.getUsers);
router.post('/users',
  authenticate,
  authorize(Role.ADMIN),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']),
  ],
  validateRequest,
  userController.createUser
);
router.get('/users/developers',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  userController.getDevelopers
);

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
router.get('/clients',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  userController.getClients
);
router.post('/clients',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  [body('name').trim().notEmpty(), body('email').isEmail()],
  validateRequest,
  userController.createClient
);

// ─── PROJECTS ────────────────────────────────────────────────────────────────
router.get('/projects', authenticate, projectController.getProjects);
router.get('/projects/:id', authenticate, projectController.getProjectById);
router.post('/projects',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  [body('name').trim().notEmpty(), body('clientId').notEmpty()],
  validateRequest,
  projectController.createProject
);
router.patch('/projects/:id',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  projectController.updateProject
);
router.delete('/projects/:id',
  authenticate,
  authorize(Role.ADMIN),
  projectController.deleteProject
);

// ─── TASKS ───────────────────────────────────────────────────────────────────
router.get('/tasks', authenticate, taskController.getTasks);
router.get('/tasks/:id', authenticate, taskController.getTaskById);
router.get('/tasks/:id/activity', authenticate, taskController.getTaskActivityLog);
router.post('/tasks',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  [
    body('title').trim().notEmpty(),
    body('projectId').notEmpty(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    body('dueDate').optional().isISO8601(),
  ],
  validateRequest,
  taskController.createTask
);
router.patch('/tasks/:id/status',
  authenticate,
  [body('status').isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])],
  validateRequest,
  taskController.updateTaskStatus
);
router.patch('/tasks/:id',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  taskController.updateTask
);
router.delete('/tasks/:id',
  authenticate,
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  taskController.deleteTask
);

// ─── ACTIVITY ────────────────────────────────────────────────────────────────
router.get('/activity',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  activityController.getActivityFeed
);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
router.get('/notifications', authenticate, notificationController.getNotifications);
router.patch('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.patch('/notifications/read-all', authenticate, notificationController.markAllAsRead);

export default router;
