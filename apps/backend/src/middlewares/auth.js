import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
        streak: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Account not found or inactive', 401, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.[COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true }
      });
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Ignore error for optional auth and proceed
    req.user = null;
    next();
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Forbidden. Administrator access required.', 403, 'FORBIDDEN'));
  }
  next();
}
