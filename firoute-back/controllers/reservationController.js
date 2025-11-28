import { PrismaClient } from "@prisma/client";
import { createSystemActivity } from "./systemActivityController.js";
import { createRadiusAccountsForReservation } from "../radius/createRadiusAccounts.js";
import { deleteRadiusAccountsByUsernames } from "../radius/deleteRadiusAccounts.js";
import { emitCustomerStatusUpdate, emitCustomerUpdate } from "../socket.js";
const prisma = new PrismaClient();

// Bütün rezervasiyaları əldə et
export const getAllReservations = async (req, res) => {
  try {
    const { status, roomId, customerId } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (roomId) {
      where.roomId = roomId;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    console.error('Rezervasiyaları əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiyaları əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək rezervasiya əldə et
export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.reservation.findUnique({
      where: { id: id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true
          }
        }
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Rezervasiya tapılmadı'
      });
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('Rezervasiyanı əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiyanı əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni rezervasiya yarat
export const createReservation = async (req, res) => {
  try {
    const {
      customerId,
      roomId,
      guestCount,
      checkIndate,
      checkOutdate,
      wifiProfileId
    } = req.body;

    // Validasiya
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Müştəri seçilməlidir'
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Otaq seçilməlidir'
      });
    }

    if (!guestCount || guestCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Qonaq sayı ən azı 1 olmalıdır'
      });
    }

    if (!checkIndate || !checkOutdate) {
      return res.status(400).json({
        success: false,
        message: 'Check-in və check-out tarixləri tələb olunur'
      });
    }

    // Tarix və saat validasiyası
    const checkIn = new Date(checkIndate);
    const checkOut = new Date(checkOutdate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün tarix və vaxt formatı daxil edin'
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out tarixi və vaxtı check-in tarixindən sonra olmalıdır'
      });
    }

    // Müştərinin mövcudluğunu yoxla
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müştəri tapılmadı'
      });
    }

    // Otağın mövcudluğunu yoxla
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Otaq tapılmadı'
      });
    }

    // Otağın used statusunu yoxla
    if (room.used) {
      return res.status(400).json({
        success: false,
        message: 'Bu otaq hal-hazırda məşğuldur'
      });
    }

    // WiFi profil validasiyası (əgər verilmişsə)
    let wifiAccounts = null;
    if (wifiProfileId && wifiProfileId.trim()) {
      // Radius accounts yarat
      try {
        wifiAccounts = await createRadiusAccountsForReservation({
          roomNumber: room.number,
          guestCount: parseInt(guestCount),
          groupName: wifiProfileId.trim(),
          customerId: customerId
        });
      } catch (error) {
        console.error('WiFi accounts yaratmaqda xəta:', error);
        // Xəta olsa belə rezervasiya yaradılır, amma WiFi accounts olmayacaq
      }
    }

    // Rezervasiya yaradılanda həmişə CHECKED_IN statusu verilir
    const status = 'CHECKED_IN';

    const reservation = await prisma.reservation.create({
      data: {
        customerId: customerId,
        roomId: roomId,
        guestCount: parseInt(guestCount),
        checkIndate: new Date(checkIndate),
        checkOutdate: new Date(checkOutdate),
        status: status,
        wifiProfileId: wifiProfileId?.trim() || null,
        wifiProvisioned: false
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true
          }
        }
      }
    });

    // Müştərini aktiv et (rezervasiya yaradıldığı üçün)
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: true },
      include: {
        reservations: {
          include: {
            room: {
              select: {
                id: true,
                number: true,
                floor: true
              }
            }
          },
          orderBy: { checkIndate: 'desc' }
        },
        radcheckAccounts: true
      }
    });

    // WebSocket ilə customer status dəyişikliyini emit et
    try {
      emitCustomerStatusUpdate(updatedCustomer);
      emitCustomerUpdate(updatedCustomer);
    } catch (error) {
      console.error('Error emitting customer status update:', error);
    }

    // Create system activity
    await createSystemActivity({
      action: 'reservation_created',
      actionType: 'success',
      message: `${customer.firstName} ${customer.lastName} - Otaq ${room.number} üçün rezervasiya yaradıldı`,
      customerId: customer.id,
      userId: req.user?.id || null,
      details: {
        reservationId: reservation.id,
        roomNumber: room.number,
        guestCount: reservation.guestCount,
        checkIndate: reservation.checkIndate,
        checkOutdate: reservation.checkOutdate,
        wifiProfileId: reservation.wifiProfileId
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'Rezervasiya uğurla yaradıldı',
      data: reservation,
      wifiAccounts: wifiAccounts // WiFi accounts varsa əlavə et
    });
  } catch (error) {
    console.error('Rezervasiya yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiya yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Rezervasiya yenilə
export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      roomId,
      guestCount,
      checkIndate,
      checkOutdate,
      status,
      wifiProfileId
    } = req.body;

    // Rezervasiyanın mövcudluğunu yoxla
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: id },
      include: {
        customer: true,
        room: true
      }
    });

    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        message: 'Rezervasiya tapılmadı'
      });
    }

    // Validasiya
    if (customerId && customerId !== existingReservation.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Müştəri tapılmadı'
        });
      }
    }

    if (roomId && roomId !== existingReservation.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Otaq tapılmadı'
        });
      }

      // Otağın used statusunu yoxla
      if (room.used) {
        return res.status(400).json({
          success: false,
          message: 'Bu otaq hal-hazırda məşğuldur'
        });
      }
    }

    // Tarix və saat validasiyası
    if (checkIndate && checkOutdate) {
      const checkIn = new Date(checkIndate);
      const checkOut = new Date(checkOutdate);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Düzgün tarix və vaxt formatı daxil edin'
        });
      }

      if (checkOut <= checkIn) {
        return res.status(400).json({
          success: false,
          message: 'Check-out tarixi və vaxtı check-in tarixindən sonra olmalıdır'
        });
      }
    }

    const updateData = {
      customerId: customerId || existingReservation.customerId,
      roomId: roomId || existingReservation.roomId,
      guestCount: guestCount ? parseInt(guestCount) : existingReservation.guestCount,
      checkIndate: checkIndate ? new Date(checkIndate) : existingReservation.checkIndate,
      checkOutdate: checkOutdate ? new Date(checkOutdate) : existingReservation.checkOutdate,
      wifiProfileId: wifiProfileId !== undefined ? (wifiProfileId?.trim() || null) : existingReservation.wifiProfileId
    };

    if (status) {
      updateData.status = status;
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true
          }
        }
      }
    });

    // Create system activity
    await createSystemActivity({
      action: 'reservation_updated',
      actionType: 'info',
      message: `Rezervasiya yeniləndi - Otaq ${updatedReservation.room.number}`,
      customerId: updatedReservation.customerId,
      userId: req.user?.id || null,
      details: {
        reservationId: updatedReservation.id,
        roomNumber: updatedReservation.room.number,
        status: updatedReservation.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Rezervasiya uğurla yeniləndi',
      data: updatedReservation
    });
  } catch (error) {
    console.error('Rezervasiyanı yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiyanı yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Rezervasiya sil
export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id },
      include: {
        customer: true,
        room: true
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Rezervasiya tapılmadı'
      });
    }

    // CHECKED_IN statusunda olan rezervasiyaları silməyə icazə vermə
    if (reservation.status === 'CHECKED_IN') {
      return res.status(400).json({
        success: false,
        message: 'Check-in edilmiş rezervasiya silinə bilməz. Əvvəlcə check-out edin'
      });
    }

    // Rezervasiya silinəndə radius accounts-ləri sil (əgər varsa)
    try {
      // Bu rezervasiya üçün yaradılmış username-ləri tap (R{roomNumber}-{1..guestCount})
      const usernames = [];
      for (let i = 1; i <= reservation.guestCount; i++) {
        usernames.push(`R${reservation.room.number}-${i}`);
      }
      
      // Radius accounts-ləri sil (həm Radius DB-dən, həm də Prisma-dan)
      await deleteRadiusAccountsByUsernames(usernames);
    } catch (error) {
      console.error('Radius accounts silməkdə xəta:', error);
      // Xəta olsa belə davam et
    }

    await prisma.reservation.delete({
      where: { id: id }
    });

    // Müştərinin başqa aktiv rezervasiyası yoxdursa deaktiv et
    const otherActiveReservations = await prisma.reservation.findFirst({
      where: {
        customerId: reservation.customerId,
        id: { not: id },
        status: 'CHECKED_IN'
      }
    });

    if (!otherActiveReservations) {
      const updatedCustomer = await prisma.customer.update({
        where: { id: reservation.customerId },
        data: { isActive: false },
        include: {
          reservations: {
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  floor: true
                }
              }
            },
            orderBy: { checkIndate: 'desc' }
          },
              radcheckAccounts: true
        }
      });

      // WebSocket ilə customer status dəyişikliyini emit et
      try {
        emitCustomerStatusUpdate(updatedCustomer);
        emitCustomerUpdate(updatedCustomer);
      } catch (error) {
        console.error('Error emitting customer status update:', error);
      }
    }

    // Create system activity
    await createSystemActivity({
      action: 'reservation_deleted',
      actionType: 'warning',
      message: `${reservation.customer.firstName} ${reservation.customer.lastName} - Otaq ${reservation.room.number} üçün rezervasiya silindi`,
      customerId: reservation.customerId,
      userId: req.user?.id || null,
      details: {
        reservationId: reservation.id,
        roomNumber: reservation.room.number
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Rezervasiya uğurla silindi'
    });
  } catch (error) {
    console.error('Rezervasiyanı silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiyanı silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Rezervasiya statusunu dəyişdir (check-in, check-out, cancel)
export const updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id },
      include: {
        customer: true,
        room: true
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Rezervasiya tapılmadı'
      });
    }

    // Status validasiyası
    const validStatuses = ['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Düzgün status daxil edin (PENDING, CHECKED_IN, CHECKED_OUT, CANCELED)'
      });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: id },
      data: {
        status: status
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true
          }
        }
      }
    });

    // Status dəyişikliyinə görə customer statusunu yenilə
    if (status === 'CHECKED_IN') {
      // Rezervasiya aktiv olduqda müştərini aktiv et
      await prisma.customer.update({
        where: { id: reservation.customerId },
        data: { isActive: true }
      });
    } else if (status === 'CHECKED_OUT' || status === 'CANCELED') {
      // Rezervasiya bitdikdə və ya ləğv edildikdə radius accounts-ləri sil
      try {
        // Bu rezervasiya üçün yaradılmış radius accounts-ləri tap
        const room = await prisma.room.findUnique({
          where: { id: reservation.roomId }
        });
        
        if (room) {
          // Bu rezervasiya üçün yaradılmış username-ləri tap (R{roomNumber}-{1..guestCount})
          const usernames = [];
          for (let i = 1; i <= reservation.guestCount; i++) {
            usernames.push(`R${room.number}-${i}`);
          }
          
          // Radius accounts-ləri sil (həm Radius DB-dən, həm də Prisma-dan)
          await deleteRadiusAccountsByUsernames(usernames);
        }
      } catch (error) {
        console.error('Radius accounts silməkdə xəta:', error);
        // Xəta olsa belə davam et
      }

      // Rezervasiya bitdikdə və ya ləğv edildikdə, başqa aktiv rezervasiya yoxdursa müştərini deaktiv et
      const otherActiveReservations = await prisma.reservation.findFirst({
        where: {
          customerId: reservation.customerId,
          id: { not: id },
          status: 'CHECKED_IN'
        }
      });

      if (!otherActiveReservations) {
        const updatedCustomer = await prisma.customer.update({
          where: { id: reservation.customerId },
          data: { isActive: false },
          include: {
            reservations: {
              include: {
                room: {
                  select: {
                    id: true,
                    number: true,
                    floor: true
                  }
                }
              },
              orderBy: { checkIndate: 'desc' }
            },
              radcheckAccounts: true
          }
        });

        // WebSocket ilə customer status dəyişikliyini emit et
        try {
          emitCustomerStatusUpdate(updatedCustomer);
          emitCustomerUpdate(updatedCustomer);
        } catch (error) {
          console.error('Error emitting customer status update:', error);
        }
      }
    }

    // Create system activity
    const statusMessages = {
      'CHECKED_IN': 'Check-in edildi',
      'CHECKED_OUT': 'Check-out edildi',
      'CANCELED': 'Ləğv edildi',
      'PENDING': 'Gözləməyə qaytarıldı'
    };

    await createSystemActivity({
      action: 'reservation_status_changed',
      actionType: 'info',
      message: `${reservation.customer.firstName} ${reservation.customer.lastName} - Otaq ${reservation.room.number} ${statusMessages[status] || 'status dəyişdirildi'}`,
      customerId: reservation.customerId,
      userId: req.user?.id || null,
      details: {
        reservationId: updatedReservation.id,
        roomNumber: reservation.room.number,
        status: updatedReservation.status,
        previousStatus: reservation.status
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: `Rezervasiya ${statusMessages[status] || 'status dəyişdirildi'}`,
      data: updatedReservation
    });
  } catch (error) {
    console.error('Rezervasiya statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasiya statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};

