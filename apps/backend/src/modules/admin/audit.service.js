import prisma from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export class AuditService {
  /**
   * Records a privileged administrative event
   */
  static async logAction({
    actorId = null,
    actorEmail = 'system',
    action,
    entityType,
    entityId = null,
    details = {},
    outcome = 'SUCCESS',
    req = null
  }) {
    try {
      const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null;
      const userAgent = req?.headers?.['user-agent'] || null;

      // Sanitize details: never persist password hashes, tokens, or raw secrets
      const sanitizedDetails = { ...details };
      delete sanitizedDetails.password;
      delete sanitizedDetails.passwordHash;
      delete sanitizedDetails.token;
      delete sanitizedDetails.cookie;

      return await prisma.auditLog.create({
        data: {
          actorId,
          actorEmail,
          action,
          entityType,
          entityId: entityId ? String(entityId) : null,
          details: sanitizedDetails,
          outcome,
          ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
          userAgent: userAgent ? String(userAgent).slice(0, 255) : null
        }
      });
    } catch (err) {
      logger.error(`Failed to record audit log: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs
   */
  static async getAuditLogs({
    page = 1,
    limit = 25,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null
  } = {}) {
    const take = Math.min(100, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      total,
      page: Number(page),
      limit: take,
      totalPages: Math.ceil(total / take),
      logs
    };
  }
}
