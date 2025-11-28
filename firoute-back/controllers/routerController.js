import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createSystemActivity } from "./systemActivityController.js";
const prisma = new PrismaClient();

// Bütün router-ləri əldə et
export const getAllRouters = async (req, res) => {
  try {
    const { status, networkInterface } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (networkInterface) {
      where.networkInterface = networkInterface;
    }

    const routers = await prisma.router.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: routers
    });
  } catch (error) {
    console.error('Router-ləri əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router-ləri əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək router əldə et
export const getRouterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const router = await prisma.router.findUnique({
      where: { id: id }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router tapılmadı'
      });
    }

    res.json({
      success: true,
      data: router
    });
  } catch (error) {
    console.error('Router-i əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router-i əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni router yarat
export const createRouter = async (req, res) => {
  try {
    const {
      name,
      ip,
      port,
      username,
      password,
      networkInterface,
      status
    } = req.body;

    // Validasiya
    if (!name || !ip || !port || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Ad, IP, port, istifadəçi adı və parol tələb olunur'
      });
    }

    // IP formatını yoxla (sadə validasiya)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün IP ünvanı daxil edin'
      });
    }

    // Port validasiyası
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Port 1-65535 aralığında olmalıdır'
      });
    }

    // Eyni router adının olub-olmadığını yoxla
    const existingRouter = await prisma.router.findUnique({
      where: { name: name.trim() }
    });

    if (existingRouter) {
      return res.status(400).json({
        success: false,
        message: 'Bu router adı artıq istifadə olunur'
      });
    }

    // Eyni IP və port kombinasiyasının olub-olmadığını yoxla
    const existingIPPort = await prisma.router.findFirst({
      where: {
        ip: ip.trim(),
        port: port.trim()
      }
    });

    if (existingIPPort) {
      return res.status(400).json({
        success: false,
        message: 'Bu IP və port kombinasiyası artıq istifadə olunur'
      });
    }

    // Parolu şifrələ
    const hashedPassword = await bcrypt.hash(password, 10);

    const router = await prisma.router.create({
      data: {
        name: name.trim(),
        ip: ip.trim(),
        port: port.trim(),
        username: username.trim(),
        password: hashedPassword,
        networkInterface: networkInterface?.trim() || null,
        status: status || 'Active'
      }
    });

    // Create system activity for router creation
    await createSystemActivity({
      action: 'router_created',
      actionType: 'success',
      message: `${router.name} - Router əlavə edildi`,
      userId: req.user?.id || null,
      details: {
        routerId: router.id,
        routerName: router.name,
        routerIP: router.ip,
        routerPort: router.port
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'Router uğurla yaradıldı',
      data: router
    });
  } catch (error) {
    console.error('Router yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Router yenilə
export const updateRouter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      ip,
      port,
      username,
      password,
      networkInterface,
      status
    } = req.body;

    // İstifadəçinin mövcudluğunu yoxla
    const existingRouter = await prisma.router.findUnique({
      where: { id: id }
    });

    if (!existingRouter) {
      return res.status(404).json({
        success: false,
        message: 'Router tapılmadı'
      });
    }

    // Validasiya
    if (!name || !ip || !port || !username) {
      return res.status(400).json({
        success: false,
        message: 'Ad, IP, port və istifadəçi adı tələb olunur'
      });
    }

    // IP formatını yoxla
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün IP ünvanı daxil edin'
      });
    }

    // Port validasiyası
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Port 1-65535 aralığında olmalıdır'
      });
    }

    // Eyni router adının başqa router-də olub-olmadığını yoxla
    if (name.trim() !== existingRouter.name) {
      const duplicateRouter = await prisma.router.findUnique({
        where: { name: name.trim() }
      });

      if (duplicateRouter) {
        return res.status(400).json({
          success: false,
          message: 'Bu router adı artıq başqa router tərəfindən istifadə olunur'
        });
      }
    }

    // Eyni IP və port kombinasiyasının başqa router-də olub-olmadığını yoxla
    if (ip.trim() !== existingRouter.ip || port.trim() !== existingRouter.port) {
      const duplicateIPPort = await prisma.router.findFirst({
        where: {
          ip: ip.trim(),
          port: port.trim(),
          id: { not: id }
        }
      });

      if (duplicateIPPort) {
        return res.status(400).json({
          success: false,
          message: 'Bu IP və port kombinasiyası artıq başqa router tərəfindən istifadə olunur'
        });
      }
    }

    const updateData = {
      name: name.trim(),
      ip: ip.trim(),
      port: port.trim(),
      username: username.trim(),
      networkInterface: networkInterface?.trim() || null,
      status: status || existingRouter.status
    };

    // Parol yalnız təmin edilirsə yenilə
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedRouter = await prisma.router.update({
      where: { id: id },
      data: updateData
    });

    // Create system activity for router update
    await createSystemActivity({
      action: 'router_updated',
      actionType: 'info',
      message: `${updatedRouter.name} - Router məlumatları yeniləndi`,
      userId: req.user?.id || null,
      details: {
        routerId: updatedRouter.id,
        routerName: updatedRouter.name,
        routerIP: updatedRouter.ip,
        routerPort: updatedRouter.port,
        statusChanged: existingRouter.status !== updatedRouter.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Router uğurla yeniləndi',
      data: updatedRouter
    });
  } catch (error) {
    console.error('Router-i yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router-i yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Router sil
export const deleteRouter = async (req, res) => {
  try {
    const { id } = req.params;

    const router = await prisma.router.findUnique({
      where: { id: id }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router tapılmadı'
      });
    }

    await prisma.router.delete({
      where: { id: id }
    });

    // Create system activity for router deletion
    await createSystemActivity({
      action: 'router_deleted',
      actionType: 'warning',
      message: `${router.name} - Router silindi`,
      userId: req.user?.id || null,
      details: {
        routerId: router.id,
        routerName: router.name,
        routerIP: router.ip
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Router uğurla silindi'
    });
  } catch (error) {
    console.error('Router-i silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router-i silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Router statusunu dəyişdir
export const toggleRouterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const router = await prisma.router.findUnique({
      where: { id: id }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router tapılmadı'
      });
    }

    // Status validasiyası
    const validStatuses = ['Active', 'Inactive', 'Maintenance'];
    const newStatus = status || (router.status === 'Active' ? 'Inactive' : 'Active');
    
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün status daxil edin (Active, Inactive, Maintenance)'
      });
    }

    const updatedRouter = await prisma.router.update({
      where: { id: id },
      data: {
        status: newStatus
      }
    });

    // Create system activity for router status change
    await createSystemActivity({
      action: 'router_status_changed',
      actionType: 'info',
      message: `Router ${updatedRouter.status === 'Active' ? 'aktivləşdirildi' : updatedRouter.status === 'Inactive' ? 'deaktivləşdirildi' : 'baxım rejiminə keçirildi'}`,
      userId: req.user?.id || null,
      details: {
        routerId: updatedRouter.id,
        routerName: updatedRouter.name,
        status: updatedRouter.status,
        previousStatus: router.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: `Router ${updatedRouter.status === 'Active' ? 'aktivləşdirildi' : updatedRouter.status === 'Inactive' ? 'deaktivləşdirildi' : 'baxım rejiminə keçirildi'}`,
      data: updatedRouter
    });
  } catch (error) {
    console.error('Router statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Router statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};

