import { PrismaClient } from "@prisma/client";
import { createSystemActivity } from "./systemActivityController.js";
const prisma = new PrismaClient();

// Bütün otaqları əldə et
export const getAllRooms = async (req, res) => {
  try {
    const { floor } = req.query;

    const where = {};
    if (floor !== undefined) {
      where.floor = parseInt(floor);
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: {
          select: {
            id: true,
            status: true,
            checkIndate: true,
            checkOutdate: true
          }
        }
      }
    });

    // Hər otaq üçün aktiv rezervasiya yoxla və used statusunu yenilə
    const now = new Date();
    const updatePromises = [];

    for (const room of rooms) {
      // Aktiv rezervasiya yoxla: status CHECKED_IN və tarix daxilində
      const hasActiveReservation = room.reservations.some(reservation => {
        if (reservation.status !== 'CHECKED_IN') {
          return false;
        }
        const checkIn = new Date(reservation.checkIndate);
        const checkOut = new Date(reservation.checkOutdate);
        return checkIn <= now && checkOut >= now;
      });

      // used statusunu yenilə
      if (hasActiveReservation && !room.used) {
        updatePromises.push(
          prisma.room.update({
            where: { id: room.id },
            data: { used: true }
          })
        );
        room.used = true;
      } else if (!hasActiveReservation && room.used) {
        updatePromises.push(
          prisma.room.update({
            where: { id: room.id },
            data: { used: false }
          })
        );
        room.used = false;
      }
    }

    // Bütün update-ləri paralel icra et
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Otaqları əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Otaqları əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək otaq əldə et
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const room = await prisma.room.findUnique({
      where: { id: id },
      include: {
        reservations: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Otaq tapılmadı'
      });
    }

    // Aktiv rezervasiya yoxla və used statusunu yenilə
    const now = new Date();
    const hasActiveReservation = room.reservations.some(reservation => {
      if (reservation.status !== 'CHECKED_IN') {
        return false;
      }
      const checkIn = new Date(reservation.checkIndate);
      const checkOut = new Date(reservation.checkOutdate);
      return checkIn <= now && checkOut >= now;
    });

    // used statusunu yenilə
    if (hasActiveReservation && !room.used) {
      await prisma.room.update({
        where: { id: room.id },
        data: { used: true }
      });
      room.used = true;
    } else if (!hasActiveReservation && room.used) {
      await prisma.room.update({
        where: { id: room.id },
        data: { used: false }
      });
      room.used = false;
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Otağı əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Otağı əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni otaq yarat
export const createRoom = async (req, res) => {
  try {
    const {
      number,
      floor
    } = req.body;

    // Validasiya
    if (!number) {
      return res.status(400).json({
        success: false,
        message: 'Otaq nömrəsi tələb olunur'
      });
    }

    // Eyni otaq nömrəsinin olub-olmadığını yoxla
    const existingRoom = await prisma.room.findUnique({
      where: { number: number.trim() }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Bu otaq nömrəsi artıq istifadə olunur'
      });
    }

    // Floor validasiyası
    let floorValue = null;
    if (floor !== undefined && floor !== null && floor !== '') {
      floorValue = parseInt(floor);
      if (isNaN(floorValue)) {
        return res.status(400).json({
          success: false,
          message: 'Mərtəbə rəqəm olmalıdır'
        });
      }
    }

    const room = await prisma.room.create({
      data: {
        number: number.trim(),
        floor: floorValue
      }
    });

    // Create system activity for room creation
    await createSystemActivity({
      action: 'room_created',
      actionType: 'success',
      message: `Otaq ${room.number} - Otaq əlavə edildi`,
      userId: req.user?.id || null,
      details: {
        roomId: room.id,
        roomNumber: room.number,
        floor: room.floor
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'Otaq uğurla yaradıldı',
      data: room
    });
  } catch (error) {
    console.error('Otaq yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Otaq yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Otaq yenilə
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      number,
      floor
    } = req.body;

    // Otağın mövcudluğunu yoxla
    const existingRoom = await prisma.room.findUnique({
      where: { id: id }
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Otaq tapılmadı'
      });
    }

    // Validasiya
    if (!number) {
      return res.status(400).json({
        success: false,
        message: 'Otaq nömrəsi tələb olunur'
      });
    }

    // Eyni otaq nömrəsinin başqa otaqda olub-olmadığını yoxla
    if (number.trim() !== existingRoom.number) {
      const duplicateRoom = await prisma.room.findUnique({
        where: { number: number.trim() }
      });

      if (duplicateRoom) {
        return res.status(400).json({
          success: false,
          message: 'Bu otaq nömrəsi artıq başqa otaq tərəfindən istifadə olunur'
        });
      }
    }

    // Floor validasiyası
    let floorValue = null;
    if (floor !== undefined && floor !== null && floor !== '') {
      floorValue = parseInt(floor);
      if (isNaN(floorValue)) {
        return res.status(400).json({
          success: false,
          message: 'Mərtəbə rəqəm olmalıdır'
        });
      }
    }

    const updateData = {
      number: number.trim(),
      floor: floorValue
    };

    const updatedRoom = await prisma.room.update({
      where: { id: id },
      data: updateData
    });

    // Create system activity for room update
    await createSystemActivity({
      action: 'room_updated',
      actionType: 'info',
      message: `Otaq ${updatedRoom.number} - Otaq məlumatları yeniləndi`,
      userId: req.user?.id || null,
      details: {
        roomId: updatedRoom.id,
        roomNumber: updatedRoom.number,
        floor: updatedRoom.floor
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Otaq uğurla yeniləndi',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Otağı yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Otağı yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Otaq sil
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: id },
      include: {
        reservations: true
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Otaq tapılmadı'
      });
    }

    // Əgər otaqda aktiv rezervasiya varsa, silməyə icazə vermə
    const activeReservations = room.reservations.filter(
      reservation => 
        reservation.status === 'PENDING' || 
        reservation.status === 'CHECKED_IN'
    );

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu otaqda aktiv rezervasiya(lar) var. Otağı silmək üçün əvvəlcə rezervasiyaları tamamlayın'
      });
    }

    await prisma.room.delete({
      where: { id: id }
    });

    // Create system activity for room deletion
    await createSystemActivity({
      action: 'room_deleted',
      actionType: 'warning',
      message: `Otaq ${room.number} - Otaq silindi`,
      userId: req.user?.id || null,
      details: {
        roomId: room.id,
        roomNumber: room.number
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Otaq uğurla silindi'
    });
  } catch (error) {
    console.error('Otağı silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Otağı silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

