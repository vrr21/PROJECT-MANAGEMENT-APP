const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

// 📥 Получить все проекты
router.get('/', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        o.ID_Order,
        o.Order_Name,
        pt.Type_Name,
        o.Creation_Date,
        o.End_Date,
        o.Status,
        o.ID_Team,
        t.Team_Name
      FROM Orders o
      LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      LEFT JOIN Teams t ON o.ID_Team = t.ID_Team
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении заказов' });
  }
});

// 📤 Создать проект
router.post('/', async (req, res) => {
  const { Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team } = req.body;
  try {
    await poolConnect;

    // Check if the project type exists
    let projectTypeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType;

    if (projectTypeResult.recordset.length > 0) {
      ID_ProjectType = projectTypeResult.recordset[0].ID_ProjectType;
    } else {
      // Insert new project type
      const insertResult = await pool.request()
        .input('typeName', sql.NVarChar, Type_Name)
        .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)');
      ID_ProjectType = insertResult.recordset[0].ID_ProjectType;
    }

    await pool.request()
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .query(`
        INSERT INTO Orders (Order_Name, ID_ProjectType, Creation_Date, End_Date, Status, ID_Team)
        VALUES (@Order_Name, @ID_ProjectType, @Creation_Date, @End_Date, @Status, @ID_Team)
      `);

    res.status(201).json({ message: 'Проект успешно создан' });
  } catch (error) {
    console.error('Ошибка при создании проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании проекта' });
  }
});

// ✏️ Обновить проект
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team } = req.body;
  try {
    await poolConnect;

    // Check if the project type exists
    let projectTypeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType;

    if (projectTypeResult.recordset.length > 0) {
      ID_ProjectType = projectTypeResult.recordset[0].ID_ProjectType;
    } else {
      // Insert new project type
      const insertResult = await pool.request()
        .input('typeName', sql.NVarChar, Type_Name)
        .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)');
      ID_ProjectType = insertResult.recordset[0].ID_ProjectType;
    }

    await pool.request()
      .input('ID_Order', sql.Int, id)
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .query(`
        UPDATE Orders
        SET Order_Name = @Order_Name,
            ID_ProjectType = @ID_ProjectType,
            Creation_Date = @Creation_Date,
            End_Date = @End_Date,
            Status = @Status,
            ID_Team = @ID_Team
        WHERE ID_Order = @ID_Order
      `);

    res.json({ message: 'Проект обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении проекта' });
  }
});

// ❌ Удалить проект
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query('DELETE FROM Orders WHERE ID_Order = @ID_Order');
    res.json({ message: 'Проект удалён' });
  } catch (error) {
    console.error('Ошибка при удалении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении проекта' });
  }
});

module.exports = router;
