const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { authenticate };
