import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

// ---- USER CONTROLLER ----
export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isOnline: true, lastSeenAt: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, users);
}

export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'Email already in use', 409);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { id: uuidv4(), name, email, password: hashed, role: role as Role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  sendSuccess(res, user, 201);
}

export async function getDevelopers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const developers = await prisma.user.findMany({
    where: { role: Role.DEVELOPER },
    select: { id: true, name: true, email: true, isOnline: true },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, developers);
}

// ---- CLIENT CONTROLLER ----
export async function getClients(req: AuthenticatedRequest, res: Response): Promise<void> {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, clients);
}

export async function createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, email, company } = req.body;

  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'Client email already exists', 409);
    return;
  }

  const client = await prisma.client.create({
    data: { id: uuidv4(), name, email, company },
  });

  sendSuccess(res, client, 201);
}
