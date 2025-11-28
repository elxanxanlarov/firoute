import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const TOKEN_COOKIE = 'token';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email və parol tələb olunur' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email və ya parol yalnışdır' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Email və ya parol yalnışdır' });
    }

    // Opaque token yarat
    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    // Session-u DB-də saxla (yalnız hash)
    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        userAgent: req.get('User-Agent') || null,
        ip: req.ip || req.connection?.remoteAddress || null,
        expiresAt,
      }
    });

    // Yalnız token cookie-də saxla — heç bir user məlumatı cookie-də yoxdur
    res
      .cookie(TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_MS,
      })
      // frontend üçün cavab: uğurlu login, amma cookie-də user məlumatı yoxdur
      .json({ success: true, message: 'Giriş uğurludur' });
  } catch (e) {
    console.error('Login xəta:', e);
    res.status(500).json({ success: false, message: 'Girişdə xəta baş verdi' });
  }
};

export const me = async (req, res) => {
  try {
    // Debug: cookie-ləri yoxla
    
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) {
      console.log('Token tapılmadı!');
      return res.status(401).json({ success: false, message: 'Auth yoxdur' });
    }

    const tokenHash = hashToken(token);

    const session = await prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() }
      },
      include: { user: { include: { role: true } } }
    });

    if (!session || !session.user) {
      return res.status(401).json({ success: false, message: 'Sessiya etibarsızdır' });
    }

    const user = session.user;
    // Serverdən yalnız lazım olan minimal public user məlumatını qaytar
    const publicUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,      // əgər email-i frontend-də görmək istəmirsinizsə buradan çıxarın
      role: user.role?.name,
    };

    res.json({ success: true, data: publicUser });
  } catch (e) {
    console.error('Me xəta:', e);
    return res.status(401).json({ success: false, message: 'Sessiya etibarsızdır' });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.session.deleteMany({ where: { tokenHash } });
    }
  } catch (e) {
    console.error('Logout DB error:', e);
  } finally {
    res
      .clearCookie(TOKEN_COOKIE)
      .json({ success: true, message: 'Çıxış edildi' });
  }
};
