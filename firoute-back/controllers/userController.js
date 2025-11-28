import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createSystemActivity } from "./systemActivityController.js";
const prisma = new PrismaClient();


export const ensureDefaultSuperadmin = async () => {
  const email = 'elxanxanlarov@gmail.com';
  const firstName = 'Elxan';
  const lastName = 'Xanlarov';
  const password = 'Elxan2003'; 

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  // Superadmin rolunu tap/yaxud yarat
  let role = await prisma.role.findUnique({ where: { name: 'Superadmin' } });
  if (!role) {
    role = await prisma.role.create({
      data: { name: 'Superadmin', description: 'Tam səlahiyyətli istifadəçi', isCore: true }
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashed,
      roleId: role.id,
      isActive: true,
    }
  });
};

// Bütün istifadəçiləri əldə et
export const getAllUsers = async (req, res) => {
  try {
    const { role, roleId, excludeCore } = req.query;

    const where = {};
    if (role) {
      where.role = { name: role };
    }
    if (roleId) {
      where.roleId = roleId;
    }

    // Exclude core roles if requested
    if (excludeCore === 'true') {
      where.role = where.role || {};
      where.role.isCore = false;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            isCore: true,
          }
        }
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('İstifadəçiləri əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçiləri əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək istifadəçi əldə et
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('İstifadəçini əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçini əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni istifadəçi yarat
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      position,
      department,
      hireDate,
      salary,
      password,
      roleId
    } = req.body;

    // Validasiya
    if (!firstName || !lastName || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Ad, soyad, parol və rol tələb olunur'
      });
    }

    // Email və ya telefon ən azı biri tələb olunur
    const hasEmail = email && email.trim();
    const hasPhone = phone && phone.trim();
    
    if (!hasEmail && !hasPhone) {
      return res.status(400).json({
        success: false,
        message: 'Email və ya telefon nömrəsi tələb olunur'
      });
    }

    // Email daxil edilərsə, formatını yoxla
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Düzgün email formatı daxil edin'
        });
      }
    }

    // Eyni email-in olub-olmadığını yoxla (yalnız email daxil edilərsə)
    if (hasEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email artıq istifadə olunur'
        });
      }
    }
    
    // Eyni telefon nömrəsinin olub-olmadığını yoxla (yalnız telefon daxil edilərsə)
    if (hasPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: phone.trim() }
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon nömrəsi artıq istifadə olunur'
        });
      }
    }
    // Rolun mövcudluğunu yoxla
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Seçilmiş rol mövcud deyil'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: hasEmail ? email.trim().toLowerCase() : null,
        phone: hasPhone ? phone.trim() : null,
        address: address?.trim() || null,
        position: position?.trim() || null,
        department: department?.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        salary: salary ? parseFloat(salary) : null,
        password: hashedPassword,
        roleId: roleId
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    // Create system activity for user creation
    await createSystemActivity({
      action: 'user_created',
      actionType: 'success',
      message: `${user.firstName} ${user.lastName} - İşçi əlavə edildi`,
      userId: req.user?.id || null,
      details: {
        createdUserId: user.id,
        userEmail: user.email,
        roleName: user.role?.name || 'Unknown',
        position: user.position,
        department: user.department
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'İstifadəçi uğurla yaradıldı',
      data: user
    });
  } catch (error) {
    console.error('İstifadəçi yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçi yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// İstifadəçi yenilə
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      position,
      department,
      hireDate,
      salary,
      password,
      roleId,
      isActive
    } = req.body;

    // İstifadəçinin mövcudluğunu yoxla
    const existingUser = await prisma.user.findUnique({
      where: { id: id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    // Validasiya
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Ad və soyad tələb olunur'
      });
    }

    // Email və ya telefon ən azı biri tələb olunur
    const hasEmail = email && email.trim();
    const hasPhone = phone && phone.trim();
    
    // Əgər mövcud user-də email və ya telefon yoxdursa, yeni dəyərlərdən ən azı biri olmalıdır
    const existingHasEmail = existingUser.email;
    const existingHasPhone = existingUser.phone;
    
    if (!existingHasEmail && !existingHasPhone && !hasEmail && !hasPhone) {
      return res.status(400).json({
        success: false,
        message: 'Email və ya telefon nömrəsi tələb olunur'
      });
    }

    // Email daxil edilərsə, formatını yoxla
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Düzgün email formatı daxil edin'
        });
      }
    }

    // Telefon nömrəsi yalnız təmin edilirsə və dəyişdirilirsə yoxla
    if (phone && phone.trim() && phone !== existingUser.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { 
          phone: phone.trim(),
          id: { not: id }
        }
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon nömrəsi artıq istifadə olunur'
        });
      }
    }

    // Eyni email-in başqa istifadəçidə olub-olmadığını yoxla (yalnız email daxil edilərsə)
    if (hasEmail) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          id: { not: id }
        }
      });

      if (duplicateUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email artıq başqa istifadəçi tərəfindən istifadə olunur'
        });
      }
    }

    // Rolun mövcudluğunu yoxla (əgər dəyişdirilirsə)
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Seçilmiş rol mövcud deyil'
        });
      }
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: hasEmail ? email.trim().toLowerCase() : (existingUser.email || null),
      phone: hasPhone ? phone.trim() : (existingUser.phone || null),
      address: address?.trim() || null,
      position: position?.trim() || null,
      department: department?.trim() || null,
      hireDate: hireDate ? new Date(hireDate) : existingUser.hireDate,
      salary: salary ? parseFloat(salary) : existingUser.salary,
      isActive: isActive !== undefined ? isActive : existingUser.isActive
    };

    // Parol yalnız təmin edilirsə yenilə
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Rol yalnız təmin edilirsə yenilə
    if (roleId) {
      updateData.roleId = roleId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    // Create system activity for user update
    await createSystemActivity({
      action: 'user_updated',
      actionType: 'info',
      message: `${updatedUser.firstName} ${updatedUser.lastName} - İşçi məlumatları yeniləndi`,
      userId: req.user?.id || null,
      details: {
        updatedUserId: updatedUser.id,
        userEmail: updatedUser.email,
        roleName: updatedUser.role?.name || 'Unknown',
        isActiveChanged: existingUser.isActive !== updatedUser.isActive
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'İstifadəçi uğurla yeniləndi',
      data: updatedUser
    });
  } catch (error) {
    console.error('İstifadəçini yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçini yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// İstifadəçi sil
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id: id.toString() }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    // Create system activity for user deletion (before delete)
    await createSystemActivity({
      action: 'user_deleted',
      actionType: 'warning',
      message: `${existingUser.firstName} ${existingUser.lastName} - İşçi silindi`,
      userId: req.user?.id || null,
      details: {
        deletedUserId: existingUser.id,
        userEmail: existingUser.email,
        roleName: existingUser.role?.name || 'Unknown'
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    await prisma.user.delete({
      where: { id: id }
    });

    res.json({
      success: true,
      message: 'İstifadəçi uğurla silindi'
    });
  } catch (error) {
    console.error('İstifadəçini silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçini silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// İstifadəçi statusunu dəyişdir
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id: id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        isActive: !existingUser.isActive
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `İstifadəçi ${updatedUser.isActive ? 'aktivləşdirildi' : 'deaktivləşdirildi'}`,
      data: updatedUser
    });
  } catch (error) {
    console.error('İstifadəçi statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçi statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};
