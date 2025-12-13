import { Router } from 'express';
import { getUsers, getUserDetails, createOrUpdateUser, deleteUser, updateAttribute } from '../../controllers/radius/radiusUsersController.js';

const router = Router();

router.get('/', getUsers);
router.get('/:username', getUserDetails);
router.put('/', createOrUpdateUser);
// Daha spesifik marşrut: istifadəçini tam sil
router.delete('/user/:username', deleteUser);
router.put('/attribute/:table/:id', updateAttribute);

router.get('/online-users', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        acctsessionid,
        username,
        callingstationid,
        framedipaddress,
        acctstarttime,
        acctinputoctets,
        acctoutputoctets
      FROM radacct
      WHERE acctstoptime IS NULL
      ORDER BY acctstarttime DESC
    `);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});



export default router;  