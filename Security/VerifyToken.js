import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const protect = (allowedRoles) => {
  return (req, res, next) => {
    verifyToken(req, res, () => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied: Insufficient role' });
      }
      next();
    });
  };
};

export { verifyToken, protect };
