import { PrismaClient } from "@prisma/client";
import { createSystemActivity } from "./systemActivityController.js";
import { createRadiusAccountForCustomer } from "../radius/createRadiusAccounts.js";
import { deleteRadiusAccountsForCustomer, deleteRadiusAccountsByUsernames } from "../radius/deleteRadiusAccounts.js";
import { emitCustomerStatusUpdate, emitCustomerUpdate } from "../socket.js";
const prisma = new PrismaClient();

// Bütün müştəriləri əldə et
export const getAllCustomers = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    const customers = await prisma.customer.findMany({
      where,
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Hər müştəri üçün aktiv rezervasiya yoxdursa isActive = false et
    const now = new Date(); // İndiki vaxt (saat ilə)
    
    // Bütün CHECKED_IN statuslu rezervasiyaları bir dəfə yoxla
    const allActiveReservations = await prisma.reservation.findMany({
      where: {
        status: 'CHECKED_IN'
      },
      select: {
        customerId: true,
        checkIndate: true,
        checkOutdate: true
      }
    });
    
    // Müştəri ID-lərinə görə aktiv rezervasiyaları qruplaşdır (tarix və saat yoxlaması ilə)
    const customerActiveReservations = {};
    allActiveReservations.forEach(res => {
      const checkIn = new Date(res.checkIndate);
      const checkOut = new Date(res.checkOutdate);
      
      // Aktiv rezervasiya: check-in <= now <= check-out (saat ilə)
      if (checkIn <= now && checkOut >= now) {
        customerActiveReservations[res.customerId] = true;
      }
    });
    
    // Müştərilərin statusunu yenilə
    const updatePromises = [];
    for (const customer of customers) {
      const hasActiveReservation = customerActiveReservations[customer.id] || false;
      
      if (!hasActiveReservation && customer.isActive) {
        // Müştəri deaktiv et
        updatePromises.push(
          prisma.customer.update({
            where: { id: customer.id },
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
          })
        );
        customer.isActive = false;
      } else if (hasActiveReservation && !customer.isActive) {
        // Müştəri aktiv et
        updatePromises.push(
          prisma.customer.update({
            where: { id: customer.id },
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
          })
        );
        customer.isActive = true;
      }
    }
    
    // Bütün update-ləri paralel icra et
    if (updatePromises.length > 0) {
      const updatedCustomers = await Promise.all(updatePromises);
      
      // WebSocket ilə customer status dəyişikliyini emit et
      for (const updatedCustomer of updatedCustomers) {
        try {
          emitCustomerStatusUpdate(updatedCustomer);
          emitCustomerUpdate(updatedCustomer);
        } catch (error) {
          console.error('Error emitting customer status update:', error);
        }
      }
    }

    // Rezervasiya müddəti bitmiş customer-lərin radius accounts-lərini sil
    try {
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: 'CHECKED_IN',
          checkOutdate: {
            lt: now // Check-out tarixi keçib
          }
        },
        include: {
          room: true,
          customer: true
        }
      });

      for (const reservation of expiredReservations) {
        // Bu rezervasiya üçün yaradılmış username-ləri tap
        const usernames = [];
        for (let i = 1; i <= reservation.guestCount; i++) {
          usernames.push(`R${reservation.room.number}-${i}`);
        }

        // Radius accounts-ləri sil
        if (usernames.length > 0) {
          try {
            await deleteRadiusAccountsByUsernames(usernames);
          } catch (error) {
            console.error(`Radius accounts silməkdə xəta (reservation ${reservation.id}):`, error);
          }
        }

        // Rezervasiya statusunu CHECKED_OUT et
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CHECKED_OUT' }
        });
      }
    } catch (error) {
      console.error('Rezervasiya müddəti bitmiş accounts-ləri silməkdə xəta:', error);
      // Xəta olsa belə davam et
    }

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Müştəriləri əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştəriləri əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək müştəri əldə et
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id: id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müştəri tapılmadı'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Müştərini əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştərini əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Yeni müştəri yarat
export const createCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      isActive
    } = req.body;

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
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: email.trim().toLowerCase() }
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Bu email artıq istifadə olunur'
        });
      }
    }

    // Telefon nömrəsi yalnız təmin edilirsə yoxla
    if (phone && phone.trim()) {
      const existingPhone = await prisma.customer.findFirst({
        where: { phone: phone.trim() }
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon nömrəsi artıq istifadə olunur'
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: hasEmail ? email.trim().toLowerCase() : null,
        phone: hasPhone ? phone.trim() : null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    // Customer yaradılanda radius account yarat (yalnız aktivdirsə)
    if (customer.isActive) {
      try {
        // Customer üçün username yarat (customer ID-nin ilk 8 simvolu)
        const username = `C${customer.id.substring(0, 8)}`;
        
        // Random password generasiya et
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let password = '';
        for (let i = 0; i < 6; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        await createRadiusAccountForCustomer({
          customerId: customer.id,
          username: username,
          password: password,
          groupName: null // Default group yoxdur, rezervasiya zamanı təyin olunur
        });
      } catch (error) {
        console.error('Radius account yaratmaqda xəta:', error);
        // Xəta olsa belə customer yaradılır
      }
    }
    // Create system activity for customer creation
    await createSystemActivity({
      action: 'customer_created',
      actionType: 'success',
      message: `${customer.firstName} ${customer.lastName} - Müştəri əlavə edildi`,
      customerId: customer.id,
      userId: req.user?.id || null,
      details: {
        customerEmail: customer.email,
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.status(201).json({
      success: true,
      message: 'Müştəri uğurla yaradıldı',
      data: customer
    });
  } catch (error) {
    console.error('Müştəri yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştəri yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Müştəri yenilə
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      isActive
    } = req.body;

    // İstifadəçinin mövcudluğunu yoxla
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: id }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Müştəri tapılmadı'
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
    
    // Əgər mövcud customer-də email və ya telefon yoxdursa, yeni dəyərlərdən ən azı biri olmalıdır
    const existingHasEmail = existingCustomer.email;
    const existingHasPhone = existingCustomer.phone;
    
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
    if (phone && phone.trim() && phone !== existingCustomer.phone) {
      const existingPhone = await prisma.customer.findFirst({
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

    // Eyni email-in başqa müştəridə olub-olmadığını yoxla (yalnız email daxil edilərsə)
    if (hasEmail) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          id: { not: id }
        }
      });

      if (duplicateCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Bu email artıq başqa müştəri tərəfindən istifadə olunur'
        });
      }
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: hasEmail ? email.trim().toLowerCase() : (existingCustomer.email || null),
      phone: hasPhone ? phone.trim() : (existingCustomer.phone || null),
      isActive: isActive !== undefined ? isActive : existingCustomer.isActive
    };

    const updatedCustomer = await prisma.customer.update({
      where: { id: id },
      data: updateData,
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
        radcheck: true
      }
    });

    // WebSocket ilə customer yenilənməsini emit et
    try {
      emitCustomerUpdate(updatedCustomer);
      if (existingCustomer.isActive !== updatedCustomer.isActive) {
        emitCustomerStatusUpdate(updatedCustomer);
      }
    } catch (error) {
      console.error('Error emitting customer update:', error);
    }

    // Customer aktiv/deaktiv olanda radius accounts-ləri yenilə
    if (existingCustomer.isActive !== updatedCustomer.isActive) {
      try {
        if (updatedCustomer.isActive) {
          // Aktiv olanda, əgər radius account yoxdursa yarat
          const existingAccount = await prisma.radcheck.findFirst({
            where: { customerId: id }
          });

          if (!existingAccount) {
            const username = `C${id.substring(0, 8)}`;
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let password = '';
            for (let i = 0; i < 6; i++) {
              password += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            await createRadiusAccountForCustomer({
              customerId: id,
              username: username,
              password: password,
              groupName: null
            });
          } else {
            // Mövcud account-u aktiv et
            await prisma.radcheck.updateMany({
              where: { customerId: id },
              data: { isActive: true }
            });
          }
        } else {
          // Deaktiv olanda radius accounts-ləri deaktiv et
          await prisma.radcheck.updateMany({
            where: { customerId: id },
            data: { isActive: false }
          });
        }
      } catch (error) {
        console.error('Radius account yeniləməkdə xəta:', error);
        // Xəta olsa belə davam et
      }
    }

    // Create system activity for customer update
    await createSystemActivity({
      action: 'customer_updated',
      actionType: 'info',
      message: `${updatedCustomer.firstName} ${updatedCustomer.lastName} - Müştəri məlumatları yeniləndi`,
      customerId: updatedCustomer.id,
      userId: req.user?.id || null,
      details: {
        customerEmail: updatedCustomer.email,
        isActiveChanged: existingCustomer.isActive !== updatedCustomer.isActive
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Müştəri uğurla yeniləndi',
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Müştərini yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştərini yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Müştəri sil
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: id },
      include: {
        reservations: true
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müştəri tapılmadı'
      });
    }

    // Müştərinin bütün rezervasiyalarını sil
    if (customer.reservations && customer.reservations.length > 0) {
      await prisma.reservation.deleteMany({
        where: { customerId: id }
      });
    }

    // Müştərinin radius accounts-lərini sil (həm Radius DB-dən, həm də Prisma-dan)
    try {
      await deleteRadiusAccountsForCustomer(id);
    } catch (error) {
      console.error('Radius accounts silməkdə xəta:', error);
      // Xəta olsa belə davam et
    }

    // Müştərini sil
    await prisma.customer.delete({
      where: { id: id }
    });

    // Create system activity for customer deletion
    await createSystemActivity({
      action: 'customer_deleted',
      actionType: 'warning',
      message: `${customer.firstName} ${customer.lastName} - Müştəri silindi`,
      customerId: customer.id,
      userId: req.user?.id || null,
      details: {
        customerEmail: customer.email
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Müştəri uğurla silindi'
    });
  } catch (error) {
    console.error('Müştərini silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştərini silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Müştəri statusunu dəyişdir
export const toggleCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müştəri tapılmadı'
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: id },
      data: {
        isActive: !customer.isActive
      }
    });

    // Customer aktiv/deaktiv olanda radius accounts-ləri yenilə
    try {
      if (updatedCustomer.isActive) {
        // Aktiv olanda, əgər radius account yoxdursa yarat
        const existingAccount = await prisma.radcheck.findFirst({
          where: { customerId: id }
        });

        if (!existingAccount) {
          const username = `C${id.substring(0, 8)}`;
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let password = '';
          for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          await createRadiusAccountForCustomer({
            customerId: id,
            username: username,
            password: password,
            groupName: null
          });
        } else {
          // Mövcud account-u aktiv et
          await prisma.radcheck.updateMany({
            where: { customerId: id },
            data: { isActive: true }
          });
        }
      } else {
        // Deaktiv olanda radius accounts-ləri deaktiv et (silmə, yalnız deaktiv et)
        await prisma.radcheck.updateMany({
          where: { customerId: id },
          data: { isActive: false }
        });
      }
    } catch (error) {
      console.error('Radius account yeniləməkdə xəta:', error);
      // Xəta olsa belə davam et
    }

    // Create system activity for customer status change
    await createSystemActivity({
      action: 'customer_status_toggled',
      actionType: 'info',
      message: `Müştəri ${updatedCustomer.isActive ? 'aktivləşdirildi' : 'deaktivləşdirildi'}`,
      customerId: updatedCustomer.id,
      userId: req.user?.id || null,
      details: {
        customerEmail: updatedCustomer.email,
        isActive: updatedCustomer.isActive
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: `Müştəri ${updatedCustomer.isActive ? 'aktivləşdirildi' : 'deaktivləşdirildi'}`,
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Müştəri statusunu dəyişdirməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Müştəri statusunu dəyişdirməkdə xəta baş verdi',
      error: error.message
    });
  }
};

