const { Router } = require("express");
const controller = require("./controller");
const middleware = require("../middleware");
const router = Router();

//----------Protected Routes----------

//----------GET REQUESTS----------
//Returns a user given its id
router.get(
	"/:userId",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	controller.getUser,
);
//Returns all planets user with given id is an owner or collaborator in
router.get(
	"/:userId/planets",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	controller.getPlanets,
);
//Returns all planet invites for a user given their id
router.get(
	"/:userId/invites",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	controller.getInvites,
);

///----------POST REQUESTS----------
//Accepts a planet invite given its id
router.post(
	"/invites/:inviteId/accept",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	middleware.limiter,
	controller.acceptInvite,
);
router.post(
	"/invites/:inviteId/decline",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	middleware.limiter,
	controller.declineInvite,
);

//----------PUT REQUESTS----------
//Updates a user with given information
router.put(
	"/:userId",
	middleware.authenticateJWT,
	middleware.authenticateRole(["user", "admin"]),
	middleware.limiter,
	controller.updateUser,
);

module.exports = router;
