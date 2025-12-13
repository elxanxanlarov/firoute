import { pool } from '../db.js';
import { PrismaClient } from "@prisma/client";
import { createSystemActivity } from './systemActivityController.js';

const prisma = new PrismaClient();

// Default "basic_profile" seed – Mikrotik-Rate-Limit: 2M/1M, Session-Timeout: 86400
export async function ensureDefaultBasicProfile() {
  const groupname = 'basic_profile';
  const rateLimitAttr = 'Mikrotik-Rate-Limit';
  const sessionAttr = 'Session-Timeout';

  try {
    // radgroupreply-də profil atributlarını yoxla
    const [exists] = await pool.query(
      `SELECT 1 FROM radgroupreply WHERE groupname = ? AND attribute = ? LIMIT 1`,
      [groupname, rateLimitAttr]
    );

    if (exists.length === 0) {
      // Yoxdursa insert et
      await pool.query(
        `INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ':=', ?)`,
        [groupname, rateLimitAttr, '2M/1M']
      );
      await pool.query(
        `INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES (?, ?, ':=', ?)`,
        [groupname, sessionAttr, '86400']
      );
      console.log('[radius] Default profile created: basic_profile (2M/1M, 86400)');
    }

    // Prisma radiusProfile metadata – upsert
    const displayName = 'Basic Profile';
    const downloadMbps = 2;
    const uploadMbps = 1;
    const sessionHours = 24;

    const found = await prisma.radiusProfile.findUnique({
      where: { groupname }
    });

    if (found) {
      await prisma.radiusProfile.update({
        where: { groupname },
        data: {
          displayName,
          downloadMbps,
          uploadMbps,
          sessionHours,
          isActive: true
        }
      });
    } else {
      await prisma.radiusProfile.create({
        data: {
          displayName,
          groupname,
          maxGuests: 1,
          downloadMbps,
          uploadMbps,
          sessionHours,
          isActive: true
        }
      });
    }
  } catch (error) {
    console.error('ensureDefaultBasicProfile error:', error);
  }
}

// Bütün profil qruplarını əldə et
export const getAllProfiles = async (req, res) => {
  try {
    // Prisma DB-dən profilləri əldə et
    const prismaProfiles = await prisma.radiusProfile.findMany({
      include: {
        radgroupreply: true
      },
      orderBy: { displayName: 'asc' }
    });

    // Radius DB-dən də məlumatları gətir (sync üçün)
    const [groups] = await pool.query(
      `SELECT DISTINCT groupname FROM radgroupreply ORDER BY groupname`
    );

    // Hər qrup üçün attribute-ları əldə et
    const profiles = await Promise.all(
      groups.map(async (group) => {
        const [attributes] = await pool.query(
          `SELECT attribute, op, value 
           FROM radgroupreply 
           WHERE groupname = ? 
           ORDER BY attribute`,
          [group.groupname]
        );

        // Prisma DB-dən profil məlumatlarını tap
        const prismaProfile = prismaProfiles.find(p => p.groupname === group.groupname);

        // Attribute-lardan məlumatları çıxar
        let downloadMbps = null;
        let uploadMbps = null;
        let sessionHours = null;

        attributes.forEach(attr => {
          if (attr.attribute === 'WISPr-Bandwidth-Max-Down') {
            downloadMbps = parseInt(attr.value) / 1000000;
          } else if (attr.attribute === 'WISPr-Bandwidth-Max-Up') {
            uploadMbps = parseInt(attr.value) / 1000000;
          } else if (attr.attribute === 'Session-Timeout') {
            sessionHours = parseInt(attr.value) / 3600;
          }
        });

        return {
          id: prismaProfile?.id || null,
          displayName: prismaProfile?.displayName || group.groupname,
          groupname: group.groupname,
          maxGuests: prismaProfile?.maxGuests || null,
          attributes: attributes,
          downloadMbps: prismaProfile?.downloadMbps ? parseFloat(prismaProfile.downloadMbps) : downloadMbps,
          uploadMbps: prismaProfile?.uploadMbps ? parseFloat(prismaProfile.uploadMbps) : uploadMbps,
          sessionHours: prismaProfile?.sessionHours ? parseFloat(prismaProfile.sessionHours) : sessionHours,
          isActive: prismaProfile?.isActive ?? true
        };
      })
    );

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Profilləri əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profilləri əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Tək profil əldə et
export const getProfileByGroupname = async (req, res) => {
  try {
    const { groupname } = req.params;

    // Prisma DB-dən profil məlumatlarını əldə et
    const prismaProfile = await prisma.radiusProfile.findUnique({
      where: { groupname: groupname },
      include: {
        radgroupreply: true
      }
    });

    // Radius DB-dən attribute-ları əldə et
    const [attributes] = await pool.query(
      `SELECT attribute, op, value 
       FROM radgroupreply 
       WHERE groupname = ? 
       ORDER BY attribute`,
      [groupname]
    );

    if (attributes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil tapılmadı'
      });
    }

    // Attribute-lardan məlumatları çıxar
    let downloadMbps = null;
    let uploadMbps = null;
    let sessionHours = null;

    attributes.forEach(attr => {
      if (attr.attribute === 'WISPr-Bandwidth-Max-Down') {
        downloadMbps = parseInt(attr.value) / 1000000;
      } else if (attr.attribute === 'WISPr-Bandwidth-Max-Up') {
        uploadMbps = parseInt(attr.value) / 1000000;
      } else if (attr.attribute === 'Session-Timeout') {
        sessionHours = parseInt(attr.value) / 3600;
      }
    });

    res.json({
      success: true,
      data: {
        id: prismaProfile?.id || null,
        displayName: prismaProfile?.displayName || groupname,
        groupname: groupname,
        maxGuests: prismaProfile?.maxGuests || null,
        attributes: attributes,
        downloadMbps: prismaProfile?.downloadMbps ? parseFloat(prismaProfile.downloadMbps) : downloadMbps,
        uploadMbps: prismaProfile?.uploadMbps ? parseFloat(prismaProfile.uploadMbps) : uploadMbps,
        sessionHours: prismaProfile?.sessionHours ? parseFloat(prismaProfile.sessionHours) : sessionHours,
        isActive: prismaProfile?.isActive ?? true
      }
    });
  } catch (error) {
    console.error('Profili əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profili əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Köhnə funksiya (deprecated - yuxarıdakı istifadə olunur)
export const getProfileByGroupnameOld = async (req, res) => {
  try {
    const { groupname } = req.params;

    const [attributes] = await pool.query(
      `SELECT attribute, op, value 
       FROM radgroupreply 
       WHERE groupname = ? 
       ORDER BY attribute`,
      [groupname]
    );

    if (attributes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil tapılmadı'
      });
    }

    res.json({
      success: true,
      data: {
        groupname: groupname,
        attributes: attributes
      }
    });
  } catch (error) {
    console.error('Profili əldə etməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profili əldə etməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Groupname avtomatik generasiya
const generateGroupname = (displayName, maxGuests) => {
  if (maxGuests) {
    return `room_${maxGuests}_person`;
  }
  
  if (displayName) {
    const normalized = displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    return normalized || `profile_${Date.now()}`;
  }
  
  return `profile_${Date.now()}`;
};

// Yeni profil yarat
export const createProfile = async (req, res) => {
  try {
    const { displayName, maxGuests, downloadMbps, uploadMbps, sessionHours } = req.body;

    // Validasiya
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Profil adı tələb olunur'
      });
    }

    if (!maxGuests || maxGuests < 1) {
      return res.status(400).json({
        success: false,
        message: 'Nəfər sayı ən azı 1 olmalıdır'
      });
    }

    if (!downloadMbps || !uploadMbps) {
      return res.status(400).json({
        success: false,
        message: 'Download və Upload sürəti tələb olunur'
      });
    }

    // Groupname avtomatik generasiya et
    const groupName = generateGroupname(displayName.trim(), maxGuests);

    // Eyni profil adının olub-olmadığını yoxla
    const [existing] = await pool.query(
      `SELECT DISTINCT groupname FROM radgroupreply WHERE groupname = ?`,
      [groupName]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu parametrlərə uyğun profil artıq mövcuddur'
      });
    }

    // Məlumatları Radius formatına çevir
    const downloadKbps = downloadMbps * 1000 * 1000; // Mbit -> bps
    const uploadKbps = uploadMbps * 1000 * 1000; // Mbit -> bps
    const sessionSeconds = sessionHours ? sessionHours * 3600 : null; // saat -> saniyə

    // Transaction başlat
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Attribute-ları insert et
      const attributes = [
        { attribute: 'WISPr-Bandwidth-Max-Down', value: downloadKbps.toString() },
        { attribute: 'WISPr-Bandwidth-Max-Up', value: uploadKbps.toString() }
      ];

      if (sessionSeconds !== null) {
        attributes.push({ attribute: 'Session-Timeout', value: sessionSeconds.toString() });
      }

      for (const attr of attributes) {
        await connection.query(
          `INSERT INTO radgroupreply (groupname, attribute, op, value) 
           VALUES (?, ?, ':=', ?)`,
          [groupName, attr.attribute, attr.value]
        );
      }

      await connection.commit();
      connection.release();

      // Prisma DB-yə yaz
      const profile = await prisma.radiusProfile.create({
        data: {
          displayName: displayName.trim(),
          groupname: groupName,
          maxGuests: parseInt(maxGuests),
          downloadMbps: parseFloat(downloadMbps),
          uploadMbps: parseFloat(uploadMbps),
          sessionHours: sessionHours ? parseFloat(sessionHours) : null,
          isActive: true,
          radgroupreply: {
            create: attributes.map(attr => ({
              groupname: groupName,
              attribute: attr.attribute,
              op: ':=',
              value: attr.value
            }))
          }
        },
        include: {
          radgroupreply: true
        }
      });

      // Create system activity
      await createSystemActivity({
        action: 'radius_profile_created',
        actionType: 'success',
        message: `${displayName} - Radius profili əlavə edildi`,
        userId: req.user?.id || null,
        details: {
          displayName: displayName,
          groupName: groupName,
          maxGuests: maxGuests,
          downloadMbps: downloadMbps,
          uploadMbps: uploadMbps,
          sessionHours: sessionHours
        },
        performedBy: req.user?.firstName 
          ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
          : 'System'
      });

      // Yeni yaradılmış profili qaytar
      const [newAttributes] = await pool.query(
        `SELECT attribute, op, value 
         FROM radgroupreply 
         WHERE groupname = ? 
         ORDER BY attribute`,
        [groupName]
      );

      res.status(201).json({
        success: true,
        message: 'Profil uğurla yaradıldı',
        data: {
          displayName: displayName,
          groupname: groupName,
          maxGuests: maxGuests,
          downloadMbps: downloadMbps,
          uploadMbps: uploadMbps,
          sessionHours: sessionHours,
          attributes: newAttributes
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Profil yaratmaqda xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profil yaratmaqda xəta baş verdi',
      error: error.message
    });
  }
};

// Profil yenilə
export const updateProfile = async (req, res) => {
  try {
    const { groupname } = req.params;
    const { displayName, maxGuests, downloadMbps, uploadMbps, sessionHours } = req.body;

    // Profilin mövcudluğunu yoxla
    const [existing] = await pool.query(
      `SELECT DISTINCT groupname FROM radgroupreply WHERE groupname = ?`,
      [groupname]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil tapılmadı'
      });
    }

    // Validasiya
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Profil adı tələb olunur'
      });
    }

    if (!maxGuests || maxGuests < 1) {
      return res.status(400).json({
        success: false,
        message: 'Nəfər sayı ən azı 1 olmalıdır'
      });
    }

    if (!downloadMbps || !uploadMbps) {
      return res.status(400).json({
        success: false,
        message: 'Download və Upload sürəti tələb olunur'
      });
    }

    // Məlumatları Radius formatına çevir
    const downloadKbps = downloadMbps * 1000 * 1000; // Mbit -> bps
    const uploadKbps = uploadMbps * 1000 * 1000; // Mbit -> bps
    const sessionSeconds = sessionHours ? sessionHours * 3600 : null; // saat -> saniyə

    // Transaction başlat
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Köhnə attribute-ları sil
      await connection.query(
        `DELETE FROM radgroupreply WHERE groupname = ?`,
        [groupname]
      );

      // Yeni attribute-ları əlavə et
      const attributes = [
        { attribute: 'WISPr-Bandwidth-Max-Down', value: downloadKbps.toString() },
        { attribute: 'WISPr-Bandwidth-Max-Up', value: uploadKbps.toString() }
      ];

      if (sessionSeconds !== null) {
        attributes.push({ attribute: 'Session-Timeout', value: sessionSeconds.toString() });
      }

      for (const attr of attributes) {
        await connection.query(
          `INSERT INTO radgroupreply (groupname, attribute, op, value) 
           VALUES (?, ?, ':=', ?)`,
          [groupname, attr.attribute, attr.value]
        );
      }

      await connection.commit();
      connection.release();

      // Prisma DB-də yenilə
      const existingProfile = await prisma.radiusProfile.findUnique({
        where: { groupname: groupname }
      });

      if (existingProfile) {
        // Profil varsa yenilə
        await prisma.radiusProfile.update({
          where: { groupname: groupname },
          data: {
            displayName: displayName.trim(),
            maxGuests: parseInt(maxGuests),
            downloadMbps: parseFloat(downloadMbps),
            uploadMbps: parseFloat(uploadMbps),
            sessionHours: sessionHours ? parseFloat(sessionHours) : null
          }
        });

        // Köhnə radgroupreply-ləri sil və yenilərini yarat
        await prisma.radgroupreply.deleteMany({
          where: { groupname: groupname }
        });

        await prisma.radgroupreply.createMany({
          data: attributes.map(attr => ({
            groupname: groupname,
            attribute: attr.attribute,
            op: ':=',
            value: attr.value,
            profileId: existingProfile.id
          }))
        });
      } else {
        // Profil yoxdursa yarat
        await prisma.radiusProfile.create({
          data: {
            displayName: displayName.trim(),
            groupname: groupname,
            maxGuests: parseInt(maxGuests),
            downloadMbps: parseFloat(downloadMbps),
            uploadMbps: parseFloat(uploadMbps),
            sessionHours: sessionHours ? parseFloat(sessionHours) : null,
            isActive: true,
            radgroupreply: {
              create: attributes.map(attr => ({
                groupname: groupname,
                attribute: attr.attribute,
                op: ':=',
                value: attr.value
              }))
            }
          }
        });
      }

      // Create system activity
      await createSystemActivity({
        action: 'radius_profile_updated',
        actionType: 'info',
        message: `${displayName} - Radius profili yeniləndi`,
        userId: req.user?.id || null,
        details: {
          displayName: displayName,
          groupname: groupname,
          maxGuests: maxGuests,
          downloadMbps: downloadMbps,
          uploadMbps: uploadMbps,
          sessionHours: sessionHours
        },
        performedBy: req.user?.firstName 
          ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
          : 'System'
      });

      // Yenilənmiş profili qaytar
      const [updatedAttributes] = await pool.query(
        `SELECT attribute, op, value 
         FROM radgroupreply 
         WHERE groupname = ? 
         ORDER BY attribute`,
        [groupname]
      );

      res.json({
        success: true,
        message: 'Profil uğurla yeniləndi',
        data: {
          displayName: displayName,
          groupname: groupname,
          maxGuests: maxGuests,
          downloadMbps: downloadMbps,
          uploadMbps: uploadMbps,
          sessionHours: sessionHours,
          attributes: updatedAttributes
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Profili yeniləməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profili yeniləməkdə xəta baş verdi',
      error: error.message
    });
  }
};

// Profil sil
export const deleteProfile = async (req, res) => {
  try {
    const { groupname } = req.params;

    // Profilin mövcudluğunu yoxla
    const [existing] = await pool.query(
      `SELECT DISTINCT groupname FROM radgroupreply WHERE groupname = ?`,
      [groupname]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil tapılmadı'
      });
    }

    // Profili sil (Radius DB-dən)
    await pool.query(
      `DELETE FROM radgroupreply WHERE groupname = ?`,
      [groupname]
    );

    // Prisma DB-dən də sil
    await prisma.radgroupreply.deleteMany({
      where: { groupname: groupname }
    });

    await prisma.radiusProfile.deleteMany({
      where: { groupname: groupname }
    });

    // Create system activity
    await createSystemActivity({
      action: 'radius_profile_deleted',
      actionType: 'warning',
      message: `${groupname} - Radius profili silindi`,
      userId: req.user?.id || null,
      details: {
        groupname: groupname
      },
      performedBy: req.user?.firstName 
        ? `${req.user.firstName} ${req.user.lastName}${req.user.role?.name ? ` (${req.user.role.name})` : ''}`
        : 'System'
    });

    res.json({
      success: true,
      message: 'Profil uğurla silindi'
    });
  } catch (error) {
    console.error('Profili silməkdə xəta:', error);
    res.status(500).json({
      success: false,
      message: 'Profili silməkdə xəta baş verdi',
      error: error.message
    });
  }
};

