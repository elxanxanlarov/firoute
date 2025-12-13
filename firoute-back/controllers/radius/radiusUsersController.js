// controllers/radiusUsersController.js
import { pool } from '../../db.js';

export async function ensureDefaultRadiusUser() {
  try {
    const [rows] = await pool.query(
      "SELECT 1 FROM radcheck WHERE username = 'user' AND attribute = 'Cleartext-Password' LIMIT 1"
    );
    if (rows.length === 0) {
      await pool.query(
        "INSERT INTO radcheck (username, attribute, op, value) VALUES ('user', 'Cleartext-Password', ':=', '1234')"
      );
      console.log('[radius] Default user recreated: user/1234');
    }
  } catch (error) {
    console.error('ensureDefaultRadiusUser error:', error);
  }
}

// 1) Sadə list: username + check attributes + reply attributes (aggregated)
export const getUsers = async (req, res) => {
  try {
    await ensureDefaultRadiusUser();

    // GROUP_CONCAT ilə hər username üçün attribute:value siyahısı düzəldirik
    const [rows] = await pool.query(`
      SELECT 
        username,
        GROUP_CONCAT(CONCAT(attribute, '::', value) SEPARATOR '|||') AS checks,
        (SELECT GROUP_CONCAT(CONCAT(attribute, '::', value) SEPARATOR '|||')
         FROM radreply r2 WHERE r2.username = r.username) AS replies
      FROM radcheck r
      WHERE r.username <> 'user'
      GROUP BY username
      LIMIT 100
    `);

    // maskalama: təhlükəsizlik üçün Cleartext-Password-ı göstərmək istəmirsənsə gizlət
    const safe = rows.map(r => {
      const parse = s => !s ? [] : s.split('|||').map(x => {
        const [attr, ...rest] = x.split('::'); const val = rest.join('::');
        return { attribute: attr, value: attr === 'Cleartext-Password' ? '*****' : val };
      });
      return {
        username: r.username,
        checks: parse(r.checks),
        replies: parse(r.replies)
      };
    });

    res.json(safe);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Users fetch error' });
  }
};

export const getUserDetails = async (req, res) => {
    const { username } = req.params;
    try {
      await ensureDefaultRadiusUser();

      const [checks] = await pool.query(
        'SELECT id, attribute, op, value FROM radcheck WHERE username = ?',
        [username]
      );
      const [replies] = await pool.query(
        'SELECT id, attribute, op, value FROM radreply WHERE username = ?',
        [username]
      );
  
      // mask password value
      checks.forEach(c => { if (c.attribute === 'Cleartext-Password') c.value = '*****'; });
  
      res.json({ username, checks, replies });
    } catch (error) {
      console.error('getUserDetails error:', error);
      res.status(500).json({ error: 'getUserDetails error' });
    }
  };


  // Delete a user and all its radius attributes (radcheck + radreply)
  export const deleteUser = async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'username required' });

    // Default user silinməz; yoxdursa bərpa olunur
    if (username === 'user') {
      await ensureDefaultRadiusUser();
      return res.status(200).json({
        ok: true,
        message: 'Default user qorunur və mövcud deyilsə avtomatik bərpa olunur.'
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r1] = await conn.query('DELETE FROM radcheck WHERE username = ?', [username]);
      const [r2] = await conn.query('DELETE FROM radreply WHERE username = ?', [username]);
      await conn.commit();
      conn.release();

      await ensureDefaultRadiusUser();

      res.json({ ok: true, deletedChecks: r1.affectedRows, deletedReplies: r2.affectedRows });
    } catch (error) {
      await conn.rollback();
      conn.release();
      console.error('deleteUser error:', error);
      res.status(500).json({ error: 'deleteUser error' });
    }
  };

  
  export const createOrUpdateUser = async (req, res) => {
    const { username, checks = [], replies = [] } = req.body;

    // Default user dəyişilməz
    if (username === 'user') {
      await ensureDefaultRadiusUser();
      return res.status(403).json({ error: 'Default user dəyişilə bilməz.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
  
      // 1) radcheck: burada atribut-əsaslı upsert nümunəsi
      for (const c of checks) {
        // tutaq ki unique (username, attribute) var — ON DUPLICATE KEY istifadə edirik
        await conn.query(
          `INSERT INTO radcheck (username, attribute, op, value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE op = VALUES(op), value = VALUES(value)`,
          [username, c.attribute, c.op || ':=', c.value]
        );
      }
  
      // 2) radreply
      for (const r of replies) {
        await conn.query(
          `INSERT INTO radreply (username, attribute, op, value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE op = VALUES(op), value = VALUES(value)`,
          [username, r.attribute, r.op || ':=', r.value]
        );
      }
  
      await conn.commit();
      conn.release();

      await ensureDefaultRadiusUser();

      res.json({ ok: true, username });
    } catch (error) {
      await conn.rollback();
      conn.release();
      console.error('createOrUpdateUser error:', error);
      res.status(500).json({ error: 'createOrUpdateUser error' });
    }
  };
  


  // deleteAttribute removed — attribute-level deletes handled via createOrUpdateUser with delete lists

  // Update a single attribute row by id (radcheck or radreply)
  export const updateAttribute = async (req, res) => {
    const { table, id } = req.params;
    const { value, op } = req.body;
    if (!['radcheck', 'radreply'].includes(table)) return res.status(400).json({ error: 'invalid table' });
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      // Default user-in parol sətirini kilidlə
      if (table === 'radcheck') {
        const [rows] = await pool.query('SELECT username, attribute FROM radcheck WHERE id = ?', [id]);
        const row = rows[0];
        if (row && row.username === 'user' && row.attribute === 'Cleartext-Password') {
          await ensureDefaultRadiusUser();
          return res.status(403).json({ error: 'Default user parolu dəyişilə bilməz.' });
        }
      }

      const [result] = await pool.query(
        `UPDATE ${table} SET value = ?, op = COALESCE(?, op) WHERE id = ?`,
        [value, op || null, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });

      await ensureDefaultRadiusUser();

      res.json({ ok: true });
    } catch (error) {
      console.error('updateAttribute error:', error);
      res.status(500).json({ error: 'updateAttribute error' });
    }
  };
  