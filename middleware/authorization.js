const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
// Permission Checking Middleware
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const { permissions } = req.user; // Assume permissions are included in the token payload
      if (
        Array.isArray(permissions) &&
        (permissions.includes("all_management") || permissions.includes(requiredPermission))
      ) {
        return next();
      }
      return res.status(403).json({
        message: "Access denied: Insufficient permissions."
      });
    } catch (error) {
      console.error("Permission checking error:", error.message);
      res.status(500).json({ message: "Internal server error." });
    }
  };
};
// Authentication Middleware
const auth = (requiredRoles = []) => {
  return (req, res, next) => {
    try {
      // Extract token from Authorization header
      const token = req.headers.authorization
      if (!token) {
        return res.status(401).json({ message: "No token provided." });
      }
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired. Please log in again." });
          }
          return res.status(403).json({ message: "Invalid token." });
        }
        req.user = {
          id: decoded._id || decoded.id,
          email: decoded.email,
          name: decoded.name,
          roles: decoded.roles,
          // permissions: decoded.permissions, // Added permissions
        };
        // console.log(req.user)
        if (requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some((role) => req.user.roles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({
              message: "Access denied: You do not have the required role."
            });
          }
        }
        next();
      });
    } catch (error) {
      console.error("Authentication error:", error.message);
      res.status(500).json({ message: "Internal server error." });
    }
  };
};
module.exports = { auth, checkPermission };


 








