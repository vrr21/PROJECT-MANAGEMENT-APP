const express = require('express');
const router = express.Router();
const { pool, poolConnect } = require('../config/db');

router.get('/members', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT ID_User AS id, First_Name + ' ' + Last_Name AS fullName, Email AS email
      FROM Users
      WHERE ID_Role = 2
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения сотрудников:', err);
    res.status(500).json({ error: 'Ошибка при получении сотрудников' });
  }
});

module.exports = router;
