const jwt = require('jsonwebtoken');

// Middleware для проверки JWT токена
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен авторизации отсутствует или неверен' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Токен не найден' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // здесь содержатся поля payload (например, id, email)
    next();
  } catch (error) {
    console.error('Ошибка при проверке токена:', error.message);
    return res.status(403).json({ message: 'Недействительный или просроченный токен' });
  }
}

module.exports = authMiddleware;
