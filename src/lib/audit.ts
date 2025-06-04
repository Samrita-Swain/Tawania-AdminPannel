import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';

interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: AuditAction;
  details?: any;
}

export async function createAuditLog({
  entityType,
  entityId,
  action,
  details,
}: AuditLogParams) {
  try {
    const session = await getServerSession(authOptions);
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Convert details to string if it's an object
    const detailsString = details ? JSON.stringify(details) : null;

    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entityType,
        entityId,
        action,
        userId: session?.user?.id,
        userName: session?.user?.name || session?.user?.email,
        details: detailsString,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent disrupting the main operation
  }
}

export async function getAuditLogsForEntity(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
