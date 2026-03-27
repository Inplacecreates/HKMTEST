import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import type { ProjectStatus } from "@/generated/prisma";

export class ProjectService {
  static async list(tenantId: string) {
    return prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { sites: true, requisitions: true } },
        creator: { select: { id: true, fullName: true } },
      },
    });
  }

  static async getById(tenantId: string, projectId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        sites: {
          include: {
            siteManager: { select: { id: true, fullName: true, phone: true } },
          },
        },
        budgets: true,
        creator: { select: { id: true, fullName: true } },
        _count: { select: { requisitions: true, documents: true, snagItems: true } },
      },
    });
  }

  static async create(params: {
    tenantId: string;
    userId: string;
    name: string;
    code: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    address?: string;
    description?: string;
    totalBudget?: number;
    startDate?: string;
    targetEndDate?: string;
  }) {
    const project = await prisma.project.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        code: params.code.toUpperCase(),
        clientName: params.clientName,
        clientPhone: params.clientPhone,
        clientEmail: params.clientEmail,
        address: params.address,
        description: params.description,
        totalBudget: params.totalBudget ?? 0,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        targetEndDate: params.targetEndDate ? new Date(params.targetEndDate) : undefined,
        createdBy: params.userId,
      },
    });

    // Create default budget categories
    await prisma.projectBudget.createMany({
      data: ["materials", "labor", "equipment", "overhead"].map((category) => ({
        projectId: project.id,
        category,
      })),
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "project",
      entityId: project.id,
      action: "project.created",
      metadata: { name: params.name, code: params.code },
    });

    return project;
  }

  static async update(params: {
    tenantId: string;
    userId: string;
    projectId: string;
    data: {
      name?: string;
      clientName?: string;
      clientPhone?: string;
      clientEmail?: string;
      address?: string;
      description?: string;
      status?: ProjectStatus;
      totalBudget?: number;
      startDate?: string;
      targetEndDate?: string;
    };
  }) {
    const project = await prisma.project.update({
      where: { id: params.projectId, tenantId: params.tenantId },
      data: {
        ...params.data,
        totalBudget: params.data.totalBudget !== undefined ? params.data.totalBudget : undefined,
        startDate: params.data.startDate ? new Date(params.data.startDate) : undefined,
        targetEndDate: params.data.targetEndDate ? new Date(params.data.targetEndDate) : undefined,
      },
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "project",
      entityId: project.id,
      action: "project.updated",
      metadata: params.data,
    });

    return project;
  }
}
