//Contains middleware to authenticate JWT and allow user to access protected routes

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const secret = process.env.JWT_SECRET;

if (!secret) throw new Error("JWT_SECRET environment variable not set.");

const authenticateRole = (roles = []) => {
  return (req, res, next) => {
    //Allow access if roles is empty or includes requesting user's role
    if (roles.length && !roles.includes(req.user.role))
    {
      return res.status(403).json({
        message: `Access denied. User with role ${req.user.role} does not have permission.`
      });
    }
    next();
  };  
};

function authenticateJWT(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; //Extract token from request headers

  if (!token) return res.status(401).json({ message: "Access denied, no token found."}); //Token not found

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ message: "Access denied, invalid token."}); //Invalid token

    //Add user information to the request and proceed
    req.user = user;
    next();
  });
}

//Limit 1 request per 30ms
const limiter = rateLimit({
  windowMs: 300, // 30ms
  max: process.env.NODE_ENV === "test" ? Infinity : 1, // limit each IP to 1 request per windowMs
  handler: (req, res) => {
    console.log("Request blocked by rate limiter");
    return res.status(429).json({
        message: "Too many requests, please try again later."
    });
  }
});

module.exports = {
  authenticateRole,
  authenticateJWT,
  limiter
};