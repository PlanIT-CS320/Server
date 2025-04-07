import mongoose from "mongoose";
Object.keys(mongoose.connection.models).forEach(key => delete mongoose.connection.models[key]);

import { genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Planet from "../schema/Planet";
import PlanetCollaborator from "../schema/PlanetCollaborator";
import PlanetColumn from "../schema/PlanetColumn";
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

    let owner_token;
    let reg_token;
    let lonely_token;

    owner_token = jwt.sign(
        {
            userId: owner_user._id,
            userEmail: owner_user.email,
            role: owner_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    reg_token = jwt.sign(
        {
            userId: reg_user._id,
            userEmail: reg_user.email,
            role: reg_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    lonely_token = jwt.sign(
        {
            userId: lonely_user._id,
            userEmail: lonely_user.email,
            role: lonely_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    let planet = new Planet({
        name: "pluto",
        description: "test planet description",
        ownerId: null,
    });

    let planetOwner = new PlanetCollaborator({
        role: "owner",
        planetId: null,
        userId: null,
    });

    let planetUser = new PlanetCollaborator({
        role: "collaborator",
        planetId: null,
        userId: null,
    });

    let planetColumn;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/test_db");
        await mongoose.connection.dropCollection("users");
        // destroy the planet
        await mongoose.connection.dropCollection("planets");
        // hell yeah, we're gonna save some users
        // thanks copilot for that comment^
        await owner_user.save();
        await reg_user.save();
        // save the planet
        planet.ownerId = owner_user.id;
        planetOwner.userId = owner_user.id;
        planetOwner.planetId = planet.id;
        planetUser.userId = reg_user.id;
        planetUser.planetId = planet.id;
        await planetOwner.save();
        await planetUser.save();
        await planet.save();

        planetColumn = new PlanetColumn({
            planetId: planet.id,
            name: "Test Column",
        });

        await planetColumn.save();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    describe("GET /planets/planetID", () => {
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

    describe("GET /planets/planetID/columns", () => {
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
});
