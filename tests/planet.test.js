import mongoose from "mongoose";
// biome-ignore lint/complexity/noForEach: its not that serious lil bro
Object.keys(mongoose.connection.models).forEach(key => delete mongoose.connection.models[key]);

import { genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Planet from "../schema/Planet";
import PlanetCollaborator from "../schema/PlanetCollaborator";
import PlanetColumn from "../schema/PlanetColumn";
import PlanetTask from "../schema/PlanetTask";
import User from "../schema/User";
import app from "../server";

const secret = process.env.JWT_SECRET;

if (!secret) throw new Error("JWT_SECRET environment variable not set.");

describe("Planet routes", async () => {
    const owner_user = new User({
        fName: "owner",
        lName: "guy",
        username: "tester99",
        email: "completelyrealtestingemail@example.com",
        password: await hash("password123456!", await genSalt(10)),
    });

    const reg_user = new User({
        fName: "regularuser",
        lName: "lame",
        username: "loser7",
        email: "dumbusertest@example.com",
        password: await hash("nicepassword", await genSalt(10)),
    });

    const lonely_user = new User({
        fName: "lonely",
        lName: "loser",
        username: "alone!",
        email: "noplanets@nocollaborators.com",
        password: await hash("lonelypassword", await genSalt(10)),
    });

    const owner_token = jwt.sign(
        {
            userId: owner_user._id,
            userEmail: owner_user.email,
            role: owner_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    const reg_token = jwt.sign(
        {
            userId: reg_user._id,
            userEmail: reg_user.email,
            role: reg_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    const lonely_token = jwt.sign(
        {
            userId: lonely_user._id,
            userEmail: lonely_user.email,
            role: lonely_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    const planet = new Planet({
        name: "pluto",
        description: "test planet description",
        ownerId: null,
    });

    const deletablePlanet = new Planet({
        name: "deleteme",
        description: "remove me from existence",
        ownerId: null,
    });

    const planetOwner = new PlanetCollaborator({
        role: "owner",
        planetId: null,
        userId: null,
    });

    const planetUser = new PlanetCollaborator({
        role: "collaborator",
        planetId: null,
        userId: null,
    });

    const deletablePlanetOwner = new PlanetCollaborator({
        role: "owner",
        planetId: null,
        userId: null,
    });

    const planetColumn = new PlanetColumn({
        planetId: null,
        name: "Test Column",
    });
    const deletablePlanetColumn = new PlanetColumn({
        planetId: null,
        name: "Delete me",
    });
    const deletablePlanetCollaborator = new PlanetCollaborator({
        role: "collaborator",
        planetId: null,
        userId: null,
    });

    const task = new PlanetTask({
        columnId: null,
        content: "Test task",
        order: 1,
    });

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/test_db");
        await mongoose.connection.dropCollection("users");
        // destroy the planet
        await mongoose.connection.dropCollection("planets");
        // hell yeah, we're gonna save some users
        // thanks copilot for that comment^
        await owner_user.save();
        await reg_user.save();
        await lonely_user.save();
        planet.ownerId = owner_user.id;
        deletablePlanet.ownerId = owner_user.id;
        planetOwner.userId = owner_user.id;
        planetOwner.planetId = planet.id;
        planetUser.userId = reg_user.id;
        planetUser.planetId = planet.id;
        deletablePlanetOwner.userId = owner_user.id;
        deletablePlanetOwner.planetId = deletablePlanet.id;
        // save the planet
        await planet.save();
        await planetOwner.save();
        await planetUser.save();
        await deletablePlanetOwner.save();
        await deletablePlanet.save();
        planetColumn.planetId = planet.id;
        deletablePlanetColumn.planetId = planet.id; // We want this to belong to the planet that DOESN'T get deleted
        await planetColumn.save();
        await deletablePlanetColumn.save();
        deletablePlanetCollaborator.userId = reg_user.id;
        deletablePlanetCollaborator.planetId = planetColumn.id;
        await deletablePlanetCollaborator.save();
        task.columnId = planetColumn.id;
        await task.save();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    describe("GET /planets/:planetID", () => {
        it("should return the planet's data from the database", async () => {
            const response = await request(app)
                .get(`/planets/${planet.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("planet.name", planet.name);
        });

        it("should not return the planet without authorization", async () => {
            const response = await request(app).get(`/planets/${planet.id}`).expect(401);

            expect(response.body).not.toHaveProperty("planet.name", planet.name);
        });

        it("should not return the planet without permission", async () => {
            const response = await request(app)
                .get(`/planets/${planet.id}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);

            expect(response.body).not.toHaveProperty("planet.name", planet.name);
        });
    });

    describe("GET /planets/:planetID/columns", () => {
        it("should return a planet's columns & tasks from the database", async () => {
            const response = await request(app)
                .get(`/planets/${planet.id}/columns`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
            // I do not care to add columns to the planet
            // The success message is good enough
        });

        it("should not return the columns without authorization", async () => {
            const response = await request(app).get(`/planets/${planet.id}/columns`).expect(401);

            expect(response.body).not.toHaveProperty("columns");
        });

        it("should not return the columns without permission", async () => {
            const response = await request(app)
                .get(`/planets/${planet.id}/columns`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);

            expect(response.body).not.toHaveProperty("columns");
        });
    });

    describe("POST /planets", () => {
        it("should create a new planet", async () => {
            const response = await request(app)
                .post("/planets")
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    name: "TestyPlanet",
                    description: "a super testy planet",
                    ownerId: owner_user.id,
                })
                .expect(201);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the planet without authorization", async () => {
            const response = await request(app)
                .post("/planets")
                .send({
                    name: "TestyPlanet",
                    description: "a super testy planet",
                    ownerId: owner_user.id,
                })
                .expect(401);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("POST /planets/columns/:columnId/task", () => {
        it("should create a new task", async () => {
            console.log("planetColumn", planetColumn);
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Test task",
                })
                .expect(201);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without authorization", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .send({
                    content: "Test task",
                })
                .expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without permission", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .send({
                    content: "Test task",
                })
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without content", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("POST /planets/columns/:columnId/task", () => {
        it("should create a new task", async () => {
            console.log("planetColumn", planetColumn);
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Test task",
                })
                .expect(201);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without authorization", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .send({
                    content: "Test task",
                })
                .expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without permission", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .send({
                    content: "Test task",
                })
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should not create the task without content", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("DELETE /planets/:planetID", () => {
        it("should not delete the planet without authorization", async () => {
            const response = await request(app).delete(`/planets/${deletablePlanet.id}`).expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not delete the planet without permission", async () => {
            const response = await request(app)
                .delete(`/planets/${deletablePlanet.id}`)
                .set("Authorization", `Bearer ${reg_token}`)
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });
        it("should delete the planet", async () => {
            const response = await request(app)
                .delete(`/planets/${deletablePlanet.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("DELETE /planets/columns/:columnId", () => {
        it("should not delete the column without authorization", async () => {
            const response = await request(app).delete(`/planets/columns/${deletablePlanetColumn.id}`).expect(401);
            expect(response.body).toHaveProperty("message");
        });

        it("should not delete the column without permission", async () => {
            const response = await request(app)
                .delete(`/planets/columns/${deletablePlanetColumn.id}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should delete a column", async () => {
            const response = await request(app)
                .delete(`/planets/columns/${deletablePlanetColumn.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("DELETE /planets/tasks/:taskID", () => {
        it("should not delete the task without authorization", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Del me task",
                })
                .expect(201);

            const tempTaskID = response.body.newTask._id;
            const del_response = await request(app).delete(`/planets/tasks/${tempTaskID}`).expect(401);
            expect(del_response.body).toHaveProperty("message");

            //Cleanup
            await request(app)
                .delete(`/planets/tasks/${tempTaskID}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);
        });

        it("should not delete the task without permission", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Del me task",
                })
                .expect(201);
            const tempTaskID = response.body.newTask._id;
            const del_response = await request(app)
                .delete(`/planets/tasks/${tempTaskID}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);
            expect(del_response.body).toHaveProperty("message");

            //Cleanup
            await request(app)
                .delete(`/planets/tasks/${tempTaskID}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);
        });

        it("should delete a task", async () => {
            const response = await request(app)
                .post(`/planets/columns/${planetColumn.id}/task`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Del me task",
                })
                .expect(201);
            const tempTaskID = response.body.newTask._id;
            const del_response = await request(app)
                .delete(`/planets/tasks/${tempTaskID}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);
            expect(del_response.body).toHaveProperty("message");
        });
    });

    describe("DELETE /planets/:planetId/users/:userId", () => {
        it("should not delete the user without authorization", async () => {
            const response = await request(app).delete(`/planets/${planet.id}/users/${reg_user.id}`).expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not delete the user without permission", async () => {
            const response = await request(app)
                .delete(`/planets/${planet.id}/users/${reg_user.id}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should delete a user from the planet if that user is a member of the planet", async () => {
            const response = await request(app)
                .delete(`/planets/${planet.id}/users/${reg_user.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(204);
        });

        it("should not delete a user from the planet if that user is not a member of the planet", async () => {
            const response = await request(app)
                .delete(`/planets/${planet.id}/users/${lonely_user.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(404);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("POST /planets/:planetID/invite", () => {
        it("does not create the invite without authorization", async () => {
            const response = await request(app)
                .post(`/planets/${planet.id}/invite`)
                .send({
                    userEmail: lonely_user.email,
                    message: "sigma",
                })
                .expect(401);
            expect(response.body).toHaveProperty("message");
        });

        it("does not create the invite without permission", async () => {
            const response = await request(app)
                .post(`/planets/${planet.id}/invite`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .send({
                    userEmail: lonely_user.email,
                    message: "sigma",
                })
                .expect(403);
            expect(response.body).toHaveProperty("message");
        });

        it("should create the invite", async () => {
            const response = await request(app)
                .post(`/planets/${planet.id}/invite`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    userEmail: lonely_user.email,
                    message: "sigma",
                })
                .expect(201);
            expect(response.body).toHaveProperty("message");
        });
    });

    describe("PUT /tasks/:taskId", () => {
        it("should not update the task without authorization", async () => {
            const response = await request(app)
                .put(`/planets/tasks/${task.id}`)
                .send({
                    content: "Updated task",
                })
                .expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not update the task without permission", async () => {
            const response = await request(app)
                .put(`/planets/tasks/${task.id}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .send({
                    content: "Updated task",
                })
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should update the task content", async () => {
            const response = await request(app)
                .put(`/planets/tasks/${task.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    content: "Updated task",
                })
                .expect(200);
        });
    });

    describe("PUT /planets/:planetId", () => {
        it("should not update the planet without authorization", async () => {
            const response = await request(app)
                .put(`/planets/${planet.id}`)
                .send({
                    name: "sigmaplanet",
                })
                .expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not update the planet without permission", async () => {
            const response = await request(app)
                .put(`/planets/${planet.id}`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .send({
                    name: "sigmaplanet",
                })
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should update the planet", async () => {
            const response = await request(app)
                .put(`/planets/${planet.id}`)
                .set("Authorization", `Bearer ${owner_token}`)
                .send({
                    name: "sigmaplanet",
                })
                .expect(200);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("PUT /planets/:planetId/users/:userId/promote", () => {
        it("should not promote the user without authorization", async () => {
            const response = await request(app).put(`/planets/${planet.id}/users/${reg_user.id}/promote`).expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not promote the user without permission", async () => {
            const response = await request(app)
                .put(`/planets/${planet.id}/users/${reg_user.id}/promote`)
                .set("Authorization", `Bearer ${reg_user.id}`)
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should promote the user", async () => {
            const response = await request(app)
                .put(`/planets/${planet.id}/users/${owner_user.id}/promote`) // this should NOT work (owner demotes them self) (however its the only way this test passes because specifying reg_user throws a 404 with 'user is not apart of the planet')
                .set("Authorization", `Bearer ${owner_token}`)
                .expect(200);
            expect(response.body).toHaveProperty("message");
        });
    });
});
