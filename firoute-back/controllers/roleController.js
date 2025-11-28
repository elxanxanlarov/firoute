import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sistem üçün əsas (silinməməli) rolları təmin et
export const ensureCoreRoles = async () => {
  const coreRoles = [
    { name: 'Superadmin', description: 'Tam səlahiyyətli istifadəçi', isCore: true },
    { name: 'Admin', description: 'İdarəçi', isCore: true },
    { name: 'Reception', description: 'Qəbul masası', isCore: true },
  ];

  for (const role of coreRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isActive: true, isCore: role.isCore },
      create: { name: role.name, description: role.description, isCore: role.isCore },
    });
  }
};

// Bütün rolları əldə et
export const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Rolları əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rolları əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək rol əldə et
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await prisma.role.findUnique({
      where: { id: id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rol tapılmadı'
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Rolu əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rolu əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni rol yarat
export const createRole = async (req, res) => {
  try {
    const { name, description, isCore } = req.body;
    const requesterRoleName = req.user?.role?.name || null;
    const isSuperadmin = requesterRoleName?.toLowerCase() === 'superadmin';

    // Validasiya
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rolun adı tələb olunur'
      });
    }

    // Eyni adlı rolun olub-olmadığını yoxla
    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() }
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Bu adlı rol artıq mövcuddur'
      });
    }

    // isCore dəyərini yalnız Superadmin təyin edə bilər
    const isCoreValue = (isCore === true && isSuperadmin) ? true : false;

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isCore: isCoreValue
      }
    });

    res.status(201).json({
      success: true,
      message: 'Rol uğurla yaradıldı',
      data: role
    });
  } catch (error) {
    console.error('Rol yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rol yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Rol yenilə
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, isCore } = req.body;

    // Rolun mövcudluğunu yoxla
    const existingRole = await prisma.role.findUnique({
      where: { id: id }
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rol tapılmadı'
      });
    }

    // Əsas (core) rolun yenilənmə qaydası: yalnız Superadmin yeniləyə bilər
    const requesterRoleName = req.user?.role?.name || null;
    const isSuperadmin = requesterRoleName?.toLowerCase() === 'superadmin';
   
    // isCore dəyərini yalnız Superadmin dəyişə bilər
    let isCoreValue = existingRole.isCore;
    if (isCore !== undefined && isSuperadmin) {
      isCoreValue = isCore;
    }

    // Validasiya
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rolun adı tələb olunur'
      });
    }

    // Eyni adlı başqa rolun olub-olmadığını yoxla
    const duplicateRole = await prisma.role.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (duplicateRole) {
      return res.status(400).json({
        success: false,
        message: 'Bu adlı başqa rol artıq mövcuddur'
      });
    }

    const updatedRole = await prisma.role.update({
      where: { id: id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : existingRole.isActive,
        isCore: isCoreValue
      }
    });

    res.json({
      success: true,
      message: 'Rol uğurla yeniləndi',
      data: updatedRole
    });
  } catch (error) {
    console.error('Rolu yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rolu yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Rol sil
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Rolun mövcudluğunu yoxla
    const existingRole = await prisma.role.findUnique({
      where: { id: id },
      include: {
        users: true
      }
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rol tapılmadı'
      });
    }

    // Əsas (core) rolun silinmə qaydası: yalnız Superadmin silə bilər
    if (existingRole.isCore) {
      const requesterRoleName = req.user?.role?.name || null;
      if (requesterRoleName !== 'Superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Bu əsas rolu yalnız Superadmin silə bilər'
        });
      }
    }

    // Əgər bu rola aid istifadəçilər varsa, silməyə icazə vermə
    if (existingRole.users.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu rola aid istifadəçilər mövcuddur. Əvvəlcə istifadəçilərin rollarını dəyişin'
      });
    }

    await prisma.role.delete({
      where: { id: id }
    });

    res.json({
      success: true,
      message: 'Rol uğurla silindi'
    });
  } catch (error) {
    console.error('Rolu silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rolu silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Rol statusunu dəyişdir
export const toggleRoleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const existingRole = await prisma.role.findUnique({
      where: { id: id }
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rol tapılmadı'
      });
    }

    // Əsas (core) rolun statusunu dəyişmə qaydası: yalnız Superadmin dəyişə bilər
    if (existingRole.isCore) {
      const requesterRoleName = req.user?.role?.name || null;
      if (requesterRoleName?.toLowerCase() !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Bu əsas rolun statusunu yalnız Superadmin dəyişə bilər'
        });
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: id },
      data: {
        isActive: !existingRole.isActive
      }
    });

    res.json({
      success: true,
      message: `Rol ${updatedRole.isActive ? 'aktivləşdirildi' : 'deaktivləşdirildi'}`,
      data: updatedRole
    });
  } catch (error) {
    console.error('Rol statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rol statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};
