const { Router } = require('express');
const controller = require('./controller');
const middleware = require('../middleware');
const router = Router();

//----------Unprotected Routes----------

//Validates a login with requested email/username and password
router.post('/login', controller.validateLogin);
//Registers a new user with requested information
router.post('/register', middleware.limiter, controller.registerUser);

module.exports = router;