import { PrismaClient } from "@prisma/client";
import { createSystemActivity } from "./systemActivityController.js";
const prisma = new PrismaClient();

// Bütün pending customer-ləri əldə et
export const getAllPendingCustomers = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const pendingCustomers = await prisma.pendingcustomer.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: pendingCustomers
    });
  } catch (error) {
    console.error('Pending customer-ləri əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer-ləri əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək pending customer əldə et
export const getPendingCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pendingCustomer = await prisma.pendingcustomer.findUnique({
      where: { id: id }
    });

    if (!pendingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Pending customer tapılmadı'
      });
    }

    res.json({
      success: true,
      data: pendingCustomer
    });
  } catch (error) {
    console.error('Pending customer-i əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer-i əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni pending customer yarat
export const createPendingCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      activityStartDate,
      activityEndDate,
      maxConnections,
      notes
    } = req.body;

    // Validasiya
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Ad və soyad tələb olunur'
      });
    }

    // Aktivlik başlanğıc tarixini yoxla (keçən günləri seçmək olmaz)
    if (activityStartDate) {
      const startDate = new Date(activityStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Aktivlik başlanğıc tarixi keçən gün ola bilməz'
        });
      }
    }

    // Aktivlik bitiş tarixini yoxla
    if (activityEndDate && activityStartDate) {
      const startDate = new Date(activityStartDate);
      const endDate = new Date(activityEndDate);
      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: 'Aktivlik bitiş tarixi başlanğıc tarixindən kiçik ola bilməz'
        });
      }
    }

    // Maksimum giriş validasiyası
    if (maxConnections && (isNaN(maxConnections) || parseInt(maxConnections) < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum giriş ən azı 1 olmalıdır'
      });
    }

    const pendingCustomer = await prisma.pendingcustomer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: null,
        email: null,
        activityStartDate: activityStartDate ? new Date(activityStartDate) : new Date(),
        activityEndDate: activityEndDate ? new Date(activityEndDate) : null,
        maxConnections: maxConnections ? parseInt(maxConnections) : null,
        notes: notes?.trim() || null,
        status: 'pending'
      }
    });

    // Create system activity for pending customer creation
    await createSystemActivity({
      action: 'pending_customer_created',
      actionType: 'info',
      message: `${pendingCustomer.firstName} ${pendingCustomer.lastName} - Pending customer sorğusu yaradıldı`,
      userId: req.user?.id || null,
      details: {
        pendingCustomerId: pendingCustomer.id
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'Pending customer uğurla yaradıldı',
      data: pendingCustomer
    });
  } catch (error) {
    console.error('Pending customer yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Pending customer yenilə
export const updatePendingCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      email,
      activityStartDate,
      activityEndDate,
      maxConnections,
      status,
      notes
    } = req.body;

    const existingPendingCustomer = await prisma.pendingcustomer.findUnique({
      where: { id: id }
    });

    if (!existingPendingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Pending customer tapılmadı'
      });
    }

    // Validasiya
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Ad və soyad tələb olunur'
      });
    }

    // Aktivlik tarixləri validasiyası
    if (activityStartDate) {
      const startDate = new Date(activityStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Aktivlik başlanğıc tarixi keçən gün ola bilməz'
        });
      }
    }

    if (activityEndDate && activityStartDate) {
      const startDate = new Date(activityStartDate);
      const endDate = new Date(activityEndDate);
      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: 'Aktivlik bitiş tarixi başlanğıc tarixindən kiçik ola bilməz'
        });
      }
    }

    // Maksimum giriş validasiyası
    if (maxConnections && (isNaN(maxConnections) || parseInt(maxConnections) < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum giriş ən azı 1 olmalıdır'
      });
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: null,
      email: null,
      activityStartDate: activityStartDate ? new Date(activityStartDate) : existingPendingCustomer.activityStartDate,
      activityEndDate: activityEndDate ? new Date(activityEndDate) : null,
      maxConnections: maxConnections ? parseInt(maxConnections) : null,
      notes: notes?.trim() || null,
      status: status || existingPendingCustomer.status
    };

    const updatedPendingCustomer = await prisma.pendingcustomer.update({
      where: { id: id },
      data: updateData
    });

    // Create system activity for pending customer update
    await createSystemActivity({
      action: 'pending_customer_updated',
      actionType: 'info',
      message: `${updatedPendingCustomer.firstName} ${updatedPendingCustomer.lastName} - Pending customer məlumatları yeniləndi`,
      userId: req.user?.id || null,
      details: {
        pendingCustomerId: updatedPendingCustomer.id,
        status: updatedPendingCustomer.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Pending customer uğurla yeniləndi',
      data: updatedPendingCustomer
    });
  } catch (error) {
    console.error('Pending customer-i yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer-i yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Pending customer sil
export const deletePendingCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const pendingCustomer = await prisma.pendingcustomer.findUnique({
      where: { id: id }
    });

    if (!pendingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Pending customer tapılmadı'
      });
    }

    await prisma.pendingcustomer.delete({
      where: { id: id }
    });

    // Create system activity for pending customer deletion
    await createSystemActivity({
      action: 'pending_customer_deleted',
      actionType: 'warning',
      message: `${pendingCustomer.firstName} ${pendingCustomer.lastName} - Pending customer silindi`,
      userId: req.user?.id || null,
      details: {
        pendingCustomerId: pendingCustomer.id
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Pending customer uğurla silindi'
    });
  } catch (error) {
    console.error('Pending customer-i silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer-i silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Pending customer statusunu dəyişdir
export const updatePendingCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const pendingCustomer = await prisma.pendingcustomer.findUnique({
      where: { id: id }
    });

    if (!pendingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Pending customer tapılmadı'
      });
    }

    // Status validasiyası
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün status daxil edin (pending, approved, rejected)'
      });
    }

    const updatedPendingCustomer = await prisma.pendingcustomer.update({
      where: { id: id },
      data: {
        status: status
      }
    });

    // Create system activity for status change
    await createSystemActivity({
      action: 'pending_customer_status_changed',
      actionType: 'info',
      message: `Pending customer ${status === 'approved' ? 'təsdiqləndi' : status === 'rejected' ? 'rədd edildi' : 'gözləməyə qaytarıldı'}`,
      userId: req.user?.id || null,
      details: {
        pendingCustomerId: updatedPendingCustomer.id,
        status: updatedPendingCustomer.status,
        previousStatus: pendingCustomer.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: `Pending customer ${status === 'approved' ? 'təsdiqləndi' : status === 'rejected' ? 'rədd edildi' : 'gözləməyə qaytarıldı'}`,
      data: updatedPendingCustomer
    });
  } catch (error) {
    console.error('Pending customer statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Pending customer statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};

