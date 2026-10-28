import prisma from '../../config/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { AuditService } from './audit.service.js';

function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export class AdminRolesService {
  /**
   * Retrieves all target roles with enrollment counts and skill mappings
   */
  static async listRoles() {
    const [roles, allSkills] = await Promise.all([
      prisma.targetRole.findMany({
        include: {
          roleSkills: {
            include: {
              skill: {
                select: { id: true, name: true, slug: true, description: true }
              }
            },
            orderBy: { importance: 'desc' }
          },
          _count: {
            select: {
              learningGoals: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.skill.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      status: role.status,
      createdAt: role.createdAt,
      enrolledLearnersCount: role._count.learningGoals,
      skills: role.roleSkills.map(rs => ({
        id: rs.skill.id,
        name: rs.skill.name,
        slug: rs.skill.slug,
        requiredLevel: rs.requiredLevel,
        importance: rs.importance
      }))
    }));

    return {
      roles: formattedRoles,
      availableSkills: allSkills
    };
  }

  /**
   * Creates a new target role
   */
  static async createRole({
    name,
    description,
    status = 'ACTIVE',
    skillIds = [],
    customSkills = [],
    actor = null,
    req = null
  }) {
    if (!name || name.trim().length < 2) {
      throw new AppError('Role name must be at least 2 characters', 400, 'INVALID_NAME');
    }
    if (!description || description.trim().length < 5) {
      throw new AppError('Role description must be at least 5 characters', 400, 'INVALID_DESCRIPTION');
    }

    const trimmedName = name.trim();
    const slug = generateSlug(trimmedName);

    // Check if duplicate name or slug exists
    const existing = await prisma.targetRole.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: 'insensitive' } },
          { slug: slug }
        ]
      }
    });

    if (existing) {
      throw new AppError(`A target role with the name "${trimmedName}" already exists`, 409, 'ROLE_EXISTS');
    }

    // Process custom skills if provided
    const resolvedSkillIds = [...(Array.isArray(skillIds) ? skillIds : [])];

    if (Array.isArray(customSkills) && customSkills.length > 0) {
      for (const skillName of customSkills) {
        const trimmedSkill = skillName.trim();
        if (trimmedSkill.length > 1) {
          const skillSlug = generateSlug(trimmedSkill);
          const skill = await prisma.skill.upsert({
            where: { slug: skillSlug },
            update: {},
            create: {
              name: trimmedSkill,
              slug: skillSlug,
              description: `Competency in ${trimmedSkill}`
            }
          });
          if (!resolvedSkillIds.includes(skill.id)) {
            resolvedSkillIds.push(skill.id);
          }
        }
      }
    }

    // Create target role with skill connections
    const role = await prisma.targetRole.create({
      data: {
        name: trimmedName,
        slug,
        description: description.trim(),
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        roleSkills: {
          create: resolvedSkillIds.map((skillId, index) => ({
            skillId,
            requiredLevel: 75,
            importance: Math.max(1, 5 - index)
          }))
        }
      },
      include: {
        roleSkills: {
          include: { skill: true }
        }
      }
    });

    // Record audit event
    await AuditService.logAction({
      actorId: actor?.id,
      actorEmail: actor?.email || 'admin',
      action: 'ROLE_CREATED',
      entityType: 'TargetRole',
      entityId: role.id,
      details: {
        name: role.name,
        slug: role.slug,
        status: role.status,
        skillsCount: resolvedSkillIds.length
      },
      req
    });

    return role;
  }

  /**
   * Updates an existing target role
   */
  static async updateRole(id, {
    name,
    description,
    status,
    skillIds,
    customSkills,
    actor = null,
    req = null
  }) {
    const existingRole = await prisma.targetRole.findUnique({
      where: { id },
      include: { roleSkills: true }
    });

    if (!existingRole) {
      throw new AppError('Target role not found', 404, 'ROLE_NOT_FOUND');
    }

    const dataToUpdate = {};

    if (name && name.trim().length >= 2) {
      const trimmedName = name.trim();
      const newSlug = generateSlug(trimmedName);

      // Check if duplicate with another role
      const duplicate = await prisma.targetRole.findFirst({
        where: {
          id: { not: id },
          OR: [
            { name: { equals: trimmedName, mode: 'insensitive' } },
            { slug: newSlug }
          ]
        }
      });

      if (duplicate) {
        throw new AppError(`A target role with the name "${trimmedName}" already exists`, 409, 'ROLE_EXISTS');
      }

      dataToUpdate.name = trimmedName;
      dataToUpdate.slug = newSlug;
    }

    if (description && description.trim().length >= 5) {
      dataToUpdate.description = description.trim();
    }

    if (status) {
      dataToUpdate.status = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    // Process skills if updated
    if (skillIds !== undefined || customSkills !== undefined) {
      const resolvedSkillIds = [...(Array.isArray(skillIds) ? skillIds : [])];

      if (Array.isArray(customSkills) && customSkills.length > 0) {
        for (const skillName of customSkills) {
          const trimmedSkill = skillName.trim();
          if (trimmedSkill.length > 1) {
            const skillSlug = generateSlug(trimmedSkill);
            const skill = await prisma.skill.upsert({
              where: { slug: skillSlug },
              update: {},
              create: {
                name: trimmedSkill,
                slug: skillSlug,
                description: `Competency in ${trimmedSkill}`
              }
            });
            if (!resolvedSkillIds.includes(skill.id)) {
              resolvedSkillIds.push(skill.id);
            }
          }
        }
      }

      // Delete existing roleSkills and re-create
      await prisma.roleSkill.deleteMany({
        where: { targetRoleId: id }
      });

      if (resolvedSkillIds.length > 0) {
        await prisma.roleSkill.createMany({
          data: resolvedSkillIds.map((skillId, index) => ({
            targetRoleId: id,
            skillId,
            requiredLevel: 75,
            importance: Math.max(1, 5 - index)
          }))
        });
      }
    }

    const updatedRole = await prisma.targetRole.update({
      where: { id },
      data: dataToUpdate,
      include: {
        roleSkills: {
          include: { skill: true }
        },
        _count: {
          select: { learningGoals: true }
        }
      }
    });

    // Record audit event
    await AuditService.logAction({
      actorId: actor?.id,
      actorEmail: actor?.email || 'admin',
      action: 'ROLE_UPDATED',
      entityType: 'TargetRole',
      entityId: id,
      details: {
        changes: dataToUpdate,
        skillsUpdated: skillIds !== undefined || customSkills !== undefined
      },
      req
    });

    return updatedRole;
  }

  /**
   * Deletes a target role or blocks if active learners depend on it
   */
  static async deleteRole(id, { force = false, actor = null, req = null } = {}) {
    const role = await prisma.targetRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: { learningGoals: true }
        }
      }
    });

    if (!role) {
      throw new AppError('Target role not found', 404, 'ROLE_NOT_FOUND');
    }

    const enrolledCount = role._count.learningGoals;
    if (enrolledCount > 0 && !force) {
      throw new AppError(
        `Cannot delete role "${role.name}" because ${enrolledCount} learner(s) have active roadmaps enrolled in this track. Consider setting its status to INACTIVE instead.`,
        400,
        'ROLE_HAS_ENROLLED_STUDENTS'
      );
    }

    // Unlink any learning goals if forcing
    if (enrolledCount > 0 && force) {
      await prisma.learningGoal.updateMany({
        where: { targetRoleId: id },
        data: { targetRoleId: null }
      });
    }

    // RoleSkills cascade delete via Prisma relation onDelete: Cascade
    await prisma.targetRole.delete({
      where: { id }
    });

    // Record audit event
    await AuditService.logAction({
      actorId: actor?.id,
      actorEmail: actor?.email || 'admin',
      action: 'ROLE_DELETED',
      entityType: 'TargetRole',
      entityId: id,
      details: {
        name: role.name,
        slug: role.slug,
        wasForced: force,
        previousEnrolledCount: enrolledCount
      },
      req
    });

    return { success: true, deletedRoleId: id };
  }
}
