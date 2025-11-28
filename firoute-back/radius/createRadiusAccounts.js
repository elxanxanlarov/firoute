import { pool as radiusPool } from '../db.js';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Random password generator
function generatePassword(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// Radius user yaratma funksiyası (rezervasiya üçün)
export async function createRadiusAccountsForReservation({
  roomNumber,
  guestCount,
  groupName,
  customerId
}) {
  const password = generatePassword(); // hamıya eyni parol
  const radcheckRows = [];
  const radgroupRows = [];
  const accounts = [];

  for (let i = 1; i <= guestCount; i++) {
    const username = `R${roomNumber}-${i}`; // R101-1
    radcheckRows.push([username, "Cleartext-Password", ":=", password]);
    radgroupRows.push([username, groupName, 0]);
    accounts.push({ username, password });
  }

  // Radius DB-yə yaz
  const conn = await radiusPool.getConnection();
  try {
    await conn.query(
      "INSERT INTO radcheck (username, attribute, op, value) VALUES ?",
      [radcheckRows]
    );

    await conn.query(
      "INSERT INTO radusergroup (username, groupname, priority) VALUES ?",
      [radgroupRows]
    );
  } finally {
    conn.release();
  }

  // Prisma DB-yə yaz (customerId varsa)
  if (customerId) {
    const prismaAccounts = accounts.map(acc => ({
      username: acc.username,
      attribute: "Cleartext-Password",
      op: ":=",
      value: acc.password,
      customerId: customerId,
      isActive: true
    }));

    await prisma.radcheck.createMany({
      data: prismaAccounts
    });
  }

  return accounts; // frontend üçün username-password siyahısı
}

// Customer üçün radius account yaratma funksiyası
export async function createRadiusAccountForCustomer({
  customerId,
  username,
  password,
  groupName
}) {
  // Radius DB-yə yaz
  const conn = await radiusPool.getConnection();
  try {
    await conn.query(
      "INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)",
      [username, "Cleartext-Password", ":=", password]
    );

    if (groupName) {
      await conn.query(
        "INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)",
        [username, groupName, 0]
      );
    }
  } finally {
    conn.release();
  }

  // Prisma DB-yə yaz
  await prisma.radcheck.create({
    data: {
      username: username,
      attribute: "Cleartext-Password",
      op: ":=",
      value: password,
      customerId: customerId,
      isActive: true
    }
  });

  return { username, password };
}

