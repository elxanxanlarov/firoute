import { pool as radiusPool } from '../db.js';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Radius accounts silmə funksiyası (həm Radius DB-dən, həm də Prisma-dan)
export async function deleteRadiusAccountsForCustomer(customerId) {
  // Prisma-dan bu müştərinin radius accounts-lərini tap
  const radcheckAccounts = await prisma.radcheck.findMany({
    where: { customerId: customerId }
  });

  if (radcheckAccounts.length === 0) {
    return; // Heç bir account yoxdursa, heç nə etmə
  }

  const usernames = radcheckAccounts.map(acc => acc.username);

  // Radius DB-dən sil
  const conn = await radiusPool.getConnection();
  try {
    // radcheck-dən sil
    await conn.query(
      "DELETE FROM radcheck WHERE username IN (?)",
      [usernames]
    );

    // radusergroup-dan sil
    await conn.query(
      "DELETE FROM radusergroup WHERE username IN (?)",
      [usernames]
    );
  } finally {
    conn.release();
  }

  // Prisma-dan sil
  await prisma.radcheck.deleteMany({
    where: { customerId: customerId }
  });
}

// Müəyyən username-ləri sil
export async function deleteRadiusAccountsByUsernames(usernames) {
  if (!usernames || usernames.length === 0) {
    return;
  }

  // Radius DB-dən sil
  const conn = await radiusPool.getConnection();
  try {
    // radcheck-dən sil
    await conn.query(
      "DELETE FROM radcheck WHERE username IN (?)",
      [usernames]
    );

    // radusergroup-dan sil
    await conn.query(
      "DELETE FROM radusergroup WHERE username IN (?)",
      [usernames]
    );
  } finally {
    conn.release();
  }

  // Prisma-dan sil
  await prisma.radcheck.deleteMany({
    where: { username: { in: usernames } }
  });
}

