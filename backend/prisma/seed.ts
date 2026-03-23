import { PrismaClient, Role, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = (p: string) => bcrypt.hash(p, 12);

  // ─── USERS ──────────────────────────────────────────────----------------
  const [adminPw, pm1Pw, pm2Pw, dev1Pw, dev2Pw, dev3Pw, dev4Pw] = await Promise.all([
    hash('Admin@123'), hash('Pm1@1234'), hash('Pm2@1234'),
    hash('Dev1@123'), hash('Dev2@123'), hash('Dev3@123'), hash('Dev4@123'),
  ]);

  const admin = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Alex Rivera', 
      email: 'admin@agency.dev', 
      password: adminPw, 
      role: Role.ADMIN 
    },
  });

  const pm1 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Sarah Chen', 
      email: 'sarah@agency.dev', 
      password: pm1Pw, 
      role: Role.PROJECT_MANAGER 
    },
  });


  const pm2 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Marcus Webb', 
      email: 'marcus@agency.dev', 
      password: pm2Pw, 
      role: Role.PROJECT_MANAGER 
    },
  });

  const dev1 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Ravi Patel', 
      email: 'ravi@agency.dev', 
      password: dev1Pw, 
      role: Role.DEVELOPER 
    },
  });

  const dev2 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Lena Schmidt', 
      email: 'lena@agency.dev', 
      password: dev2Pw, 
      role: Role.DEVELOPER 
    },
  });

  const dev3 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'James Okafor', 
      email: 'james@agency.dev', 
      password: dev3Pw, 
      role: Role.DEVELOPER 
    },
  });


  const dev4 = await prisma.user.create({
    data: { 
      id: uuidv4(), 
      name: 'Priya Nair', 
      email: 'priya@agency.dev', 
      password: dev4Pw, 
      role: Role.DEVELOPER 
    },
  });

  console.log(' Users created');

  // ─── CLIENTS ──────────────────────────────────────────────────────────────
  const clientA = await prisma.client.create({
    data: { id: uuidv4(), name: 'Nova Commerce', email: 'nova@novacommerce.io', company: 'Nova Commerce Inc.' },
  });
  const clientB = await prisma.client.create({
    data: { id: uuidv4(), name: 'HealthSync', email: 'tech@healthsync.com', company: 'HealthSync Labs' },
  });
  const clientC = await prisma.client.create({
    data: { id: uuidv4(), name: 'UrbanFlow', email: 'projects@urbanflow.co', company: 'UrbanFlow Mobility' },
  });

  console.log(' Clients created ');

  // ─── DATES ────────────────────────────────────────────────────────────────
  const past = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d; };
  const future = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };

  // ─── PROJECT 1: E-Commerce Platform (Sarah / Nova Commerce) ───────────────
  const proj1 = await prisma.project.create({
    data: {
      id: uuidv4(), name: 'Nova E-Commerce Platform', description: 'Full-stack e-commerce rebuild',
      clientId: clientA.id, managerId: pm1.id,
    },
  });

  const p1Tasks = await Promise.all([
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Product listing page', description: 'Paginated product grid with filters',
      projectId: proj1.id, assigneeId: dev1.id, status: TaskStatus.DONE,
      priority: TaskPriority.HIGH, dueDate: past(10), isOverdue: false,
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Shopping cart implementation', description: 'Persistent cart with localStorage fallback',
      projectId: proj1.id, assigneeId: dev1.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH, dueDate: future(3),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Payment gateway integration', description: 'Stripe checkout flow',
      projectId: proj1.id, assigneeId: dev2.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL, dueDate: future(7),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'User auth & profile pages', description: 'JWT-based auth with profile management',
      projectId: proj1.id, assigneeId: dev2.id, status: TaskStatus.DONE,
      priority: TaskPriority.HIGH, dueDate: past(5), isOverdue: false,
    }}),
    // OVERDUE TASK 1
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Admin inventory dashboard', description: 'CRUD interface for product inventory',
      projectId: proj1.id, assigneeId: dev1.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM, dueDate: past(3), isOverdue: true,
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Email notification system', description: 'Order confirmation & shipping emails',
      projectId: proj1.id, assigneeId: dev3.id, status: TaskStatus.TODO,
      priority: TaskPriority.LOW, dueDate: future(14),
    }}),
  ]);

  // ─── PROJECT 2: Health Dashboard (Marcus / HealthSync) ─────────────────────
  const proj2 = await prisma.project.create({
    data: {
      id: uuidv4(), name: 'HealthSync Patient Portal', description: 'Patient health record viewer',
      clientId: clientB.id, managerId: pm2.id,
    },
  });

  const p2Tasks = await Promise.all([
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Patient record viewer', description: 'Read-only medical history view',
      projectId: proj2.id, assigneeId: dev3.id, status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL, dueDate: past(8), isOverdue: false,
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Appointment scheduling', description: 'Calendar-based booking system',
      projectId: proj2.id, assigneeId: dev3.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH, dueDate: future(5),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Prescription tracker', description: 'Track medication history and refills',
      projectId: proj2.id, assigneeId: dev4.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH, dueDate: future(10),
    }}),
    // OVERDUE TASK 2
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Lab results integration', description: 'API integration with lab systems',
      projectId: proj2.id, assigneeId: dev4.id, status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL, dueDate: past(2), isOverdue: true,
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'HIPAA compliance audit', description: 'Security review and logging',
      projectId: proj2.id, assigneeId: dev3.id, status: TaskStatus.TODO,
      priority: TaskPriority.HIGH, dueDate: future(21),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Mobile responsive layout', description: 'Adapt portal for tablet and mobile',
      projectId: proj2.id, assigneeId: dev4.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM, dueDate: future(6),
    }}),
  ]);

  // ─── PROJECT 3: Mobility App (Sarah / UrbanFlow) ────────────────────────
  const proj3 = await prisma.project.create({
    data: {
      id: uuidv4(), name: 'UrbanFlow Rider App', description: 'Micro-mobility booking & tracking app',
      clientId: clientC.id, managerId: pm1.id,
    },
  });

  await Promise.all([
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Map integration', description: 'Leaflet.js real-time vehicle map',
      projectId: proj3.id, assigneeId: dev2.id, status: TaskStatus.DONE,
      priority: TaskPriority.HIGH, dueDate: past(6), isOverdue: false,
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Ride booking flow', description: 'Multi-step booking with pricing preview',
      projectId: proj3.id, assigneeId: dev1.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH, dueDate: future(4),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Push notifications', description: 'Ride status & promo notifications',
      projectId: proj3.id, assigneeId: dev2.id, status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM, dueDate: future(12),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Payment & wallet', description: 'In-app wallet with top-up flow',
      projectId: proj3.id, assigneeId: dev1.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL, dueDate: future(2),
    }}),
    prisma.task.create({ data: {
      id: uuidv4(), title: 'Ride history & receipts', description: 'Detailed trip history with PDF receipts',
      projectId: proj3.id, assigneeId: dev4.id, status: TaskStatus.TODO,
      priority: TaskPriority.LOW, dueDate: future(18),
    }}),
  ]);

  console.log('✅ Projects & tasks created');

  // ─── PRE-SEEDED ACTIVITY LOGS ─────────────────────────────────────────────
  const activityData = [
    { userId: admin.id, projectId: proj1.id, taskId: p1Tasks[0].id, action: 'STATUS_CHANGED', fromValue: 'IN_REVIEW', toValue: 'DONE', createdAt: past(10) },
    { userId: dev1.id, projectId: proj1.id, taskId: p1Tasks[1].id, action: 'STATUS_CHANGED', fromValue: 'IN_PROGRESS', toValue: 'IN_REVIEW', createdAt: past(2) },
    { userId: dev2.id, projectId: proj1.id, taskId: p1Tasks[2].id, action: 'STATUS_CHANGED', fromValue: 'TODO', toValue: 'IN_PROGRESS', createdAt: past(4) },
    { userId: pm1.id, projectId: proj1.id, taskId: p1Tasks[0].id, action: 'TASK_CREATED', toValue: p1Tasks[0].title, createdAt: past(15) },
    { userId: pm1.id, projectId: proj1.id, taskId: p1Tasks[2].id, action: 'TASK_CREATED', toValue: p1Tasks[2].title, createdAt: past(12) },
    { userId: dev3.id, projectId: proj2.id, taskId: p2Tasks[0].id, action: 'STATUS_CHANGED', fromValue: 'IN_REVIEW', toValue: 'DONE', createdAt: past(8) },
    { userId: dev3.id, projectId: proj2.id, taskId: p2Tasks[1].id, action: 'STATUS_CHANGED', fromValue: 'IN_PROGRESS', toValue: 'IN_REVIEW', createdAt: past(1) },
    { userId: dev4.id, projectId: proj2.id, taskId: p2Tasks[2].id, action: 'STATUS_CHANGED', fromValue: 'TODO', toValue: 'IN_PROGRESS', createdAt: past(3) },
    { userId: pm2.id, projectId: proj2.id, taskId: p2Tasks[0].id, action: 'TASK_CREATED', toValue: p2Tasks[0].title, createdAt: past(14) },
    { userId: admin.id, projectId: proj3.id, action: 'TASK_CREATED', toValue: 'UrbanFlow project initialized', createdAt: past(20) },
    { userId: dev1.id, projectId: proj3.id, taskId: null, action: 'STATUS_CHANGED', fromValue: 'TODO', toValue: 'IN_PROGRESS', createdAt: past(5) },
    { userId: dev2.id, projectId: proj3.id, action: 'STATUS_CHANGED', fromValue: 'IN_PROGRESS', toValue: 'DONE', createdAt: past(6) },
  ];

  await prisma.activityLog.createMany({
    data: activityData.map(a => ({ id: uuidv4(), ...a })),
  });

  console.log('✅ Activity logs seeded');

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { id: uuidv4(), recipientId: dev1.id, taskId: p1Tasks[0].id, type: 'TASK_ASSIGNED', message: `You've been assigned to "Product listing page"`, isRead: true },
      { id: uuidv4(), recipientId: dev2.id, taskId: p1Tasks[2].id, type: 'TASK_ASSIGNED', message: `You've been assigned to "Payment gateway integration"` },
      { id: uuidv4(), recipientId: pm1.id, taskId: p1Tasks[1].id, type: 'TASK_IN_REVIEW', message: `"Shopping cart implementation" is ready for review` },
      { id: uuidv4(), recipientId: dev3.id, taskId: p2Tasks[1].id, type: 'TASK_IN_REVIEW', message: `"Appointment scheduling" is in review` },
      { id: uuidv4(), recipientId: pm2.id, taskId: p2Tasks[1].id, type: 'TASK_IN_REVIEW', message: `"Appointment scheduling" is ready for review` },
    ],
  });

  console.log('✅ Notifications seeded');
  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:   admin@agency.dev   / Admin@123');
  console.log('  PM 1:    sarah@agency.dev   / Pm1@1234');
  console.log('  PM 2:    marcus@agency.dev  / Pm2@1234');
  console.log('  Dev 1:   ravi@agency.dev    / Dev1@123');
  console.log('  Dev 2:   lena@agency.dev    / Dev2@123');
  console.log('  Dev 3:   james@agency.dev   / Dev3@123');
  console.log('  Dev 4:   priya@agency.dev   / Dev4@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
