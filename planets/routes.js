const { Router } = require('express');
const controller = require('./controller');
const middleware = require('../middleware');
const router = Router();

//----------GET REQUESTS----------
//Returns a planet given its id
router.get("/:planetId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), controller.getPlanet);
//Returns all columns and their tasks of a planet given its id
router.get("/:planetId/columns", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), controller.getColumns);

//----------POST REQUESTS----------
//Creates a new planet given its name and description (in body)
router.post("/", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.createPlanet);
//Creates a new task given its columnid and content (in body)
router.post("/columns/:columnId/task", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.createTask);
//Creates a new column given its name and planet id
router.post("/:planetId/columns", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.createColumn);
//Creates a new planet invite to a user given user email (in body)
router.post("/:planetId/invite", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.sendInvite);

//----------PUT REQUESTS----------
//Updates a task given its updated fields
router.put("/tasks/:taskId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.updateTask);
//Promote a user to owner given planetId and userId
router.put("/:planetId/users/:userId/promote", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.promoteUser);
//Updates a planet given its updated fields
router.put("/:planetId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.updatePlanet);

//----------DELETE REQUESTS----------
//Deletes a planet given its id
router.delete("/:planetId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.deletePlanet);
//Deletes a column given its id
router.delete("/columns/:columnId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.deleteColumn);
//Deletes a task given its id
router.delete("/tasks/:taskId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.deleteTask);
//Removes a user from planet given planetId and userId
router.delete("/:planetId/users/:userId", middleware.authenticateJWT, middleware.authenticateRole(["user", "admin"]), middleware.limiter, controller.removeUser);

module.exports = router;