import mongoose from "mongoose";
// biome-ignore lint/complexity/noForEach: its not that serious lil bro
Object.keys(mongoose.connection.models).forEach(key => delete mongoose.connection.models[key]);

import { genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Planet from "../schema/Planet";
import PlanetCollaborator from "../schema/PlanetCollaborator";
import PlanetInvite from "../schema/PlanetInvite";
import User from "../schema/User";
import app from "../server";

const secret = process.env.JWT_SECRET;

if (!secret) throw new Error("JWT_SECRET environment variable not set.");

describe("User routes", async () => {
    const user = new User({
        fName: "ftest",
        lName: "ltest",
        username: "sigma",
        email: "test@faketestingsite.com",
        password: await hash("password123", await genSalt(10)),
    });

    const lonely_user = new User({
        fName: "lonely",
        lName: "loser",
        username: "alone!",
        email: "noplanets@nocollaborators.com",
        password: await hash("lonelypassword", await genSalt(10)),
    });

    const lonely_token = jwt.sign(
        {
            userId: lonely_user._id,
            userEmail: lonely_user.email,
            role: lonely_user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    let token = jwt.sign(
        {
            userId: user._id,
            userEmail: user.email,
            role: user.role,
        },
        secret,
        { expiresIn: "15m" }
    );

    const planet = new Planet({
        name: "pluto",
        description: "test planet description",
        ownerId: null,
    });

    const planetOwner = new PlanetCollaborator({
        role: "owner",
        planetId: null,
        userId: null,
    });

    const mock_accept_invite = new PlanetInvite({
        invitedUserId: null,
        invitingUserEmail: null,
        planetId: null,
        message: "join my planet cuh",
        planetName: null,
    });

    const mock_deny_invite = new PlanetInvite({
        invitedUserId: null,
        invitingUserEmail: null,
        planetId: null,
        message: "don't join my planet cuh",
        planetName: null,
    });

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/test_db");
        await mongoose.connection.dropCollection("users");
        await user.save();
        await lonely_user.save();

        planet.ownerId = user.id;
        planetOwner.userId = user.id;
        await planet.save();
        planetOwner.planetId = planet.id;
        await planetOwner.save();
        mock_accept_invite.invitedUserId = lonely_user.id;
        mock_accept_invite.invitingUserEmail = lonely_user.email;
        mock_accept_invite.planetId = planet.id;
        mock_accept_invite.planetName = planet.name;
        await mock_accept_invite.save();

        mock_deny_invite.invitedUserId = lonely_user.id;
        mock_deny_invite.invitingUserEmail = lonely_user.email;
        mock_deny_invite.planetId = planet.id;
        mock_deny_invite.planetName = planet.name;
        await mock_deny_invite.save();
    });

    afterAll(async () => {
        await mongoose.connection.dropCollection("users");
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    describe("GET /user/userID", () => {
        it("should get an existing user from the database", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app)
                .get(`/users/${user.id}`)
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("user.username", user.username);
            expect(response.body).toHaveProperty("user.email", user.email);
        });

        it("should not get the data if no authorization is passed", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app).get(`/users/${user.id}`).expect("Content-Type", /json/).expect(401);
        });
    });

    describe("GET /user/userID/planets", () => {
        it("should get an user's planets from the database", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app)
                .get(`/users/${user.id}/planets`)
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Successfully retrieved user's planets.");
        });

        it("should not get the data if no authorization is passed", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app)
                .get(`/users/${user.id}/planets`)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body).not.toHaveProperty("message", "User has no planets.");
        });
    });

    describe("GET /user/userID/invites", () => {
        it("should get an user's invites from the database", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app)
                .get(`/users/${user.id}/invites`)
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Successfully retrieved invites.");
        });

        it("should not get the data if no authorization is passed", async () => {
            const userData = {
                username: "testuser",
                email: "test@example.com",
            };

            const response = await request(app)
                .get(`/users/${user.id}/invites`)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body).not.toHaveProperty("message", "Successfully retrieved invites.");
        });
    });

    describe("PUT /user/userID", () => {
        it("should update an user's data in the database", async () => {
            const newData = {
                username: "newtestuser",
                email: "new.test@example.com",
            };

            const response = await request(app)
                .put(`/users/${user.id}`)
                .set("Authorization", `Bearer ${token}`)
                .set(newData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "User updated successfully.");
        });

        it("should not update the user without authorization", async () => {
            const newData = {
                username: "newtestuser",
                email: "new.test@example.com",
            };

            const response = await request(app)
                .put(`/users/${user.id}`)
                .set(newData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body).not.toHaveProperty("message", "User updated successfully.");
        });
    });

    describe("GET /users/:userId/invites", () => {
        it("should not retrieve invites without authorization", async () => {
            const response = await request(app).get(`/users/${user.id}/invites`).expect(401);

            expect(response.body).toHaveProperty("message");
            expect(response.body).not.toHaveProperty("invites");
        });

        it("should not retrieve another user's invites", async () => {
            const response = await request(app)
                .get(`/users/${user.id}/invites`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(403);

            expect(response.body).toHaveProperty("message");
            expect(response.body).not.toHaveProperty("invites");
        });

        it("should retrieve the user's invites", async () => {
            const response = await request(app)
                .get(`/users/${user.id}/invites`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
            expect(response.body).toHaveProperty("invites");
        });
    });

    describe("POST /users/invites/:inviteID/accept", () => {
        it("should not accept an invite without authorization", async () => {
            const response = await request(app).post(`/users/invites/${mock_accept_invite.id}/accept`).expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not accept another user's invites", async () => {
            const response = await request(app)
                .post(`/users/invites/${mock_accept_invite.id}/accept`)
                .set("Authorization", `Bearer ${token}`) // this is basically user accepting their own invite ig
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should accept the invite", async () => {
            const response = await request(app)
                .post(`/users/invites/${mock_accept_invite.id}/accept`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
        });
    });

    describe("POST /users/invites/:inviteID/decline", () => {
        it("should not decline an invite without authorization", async () => {
            const response = await request(app).post(`/users/invites/${mock_deny_invite.id}/decline`).expect(401);

            expect(response.body).toHaveProperty("message");
        });

        it("should not decline another user's invites", async () => {
            const response = await request(app)
                .post(`/users/invites/${mock_deny_invite.id}/decline`)
                .set("Authorization", `Bearer ${token}`) // this is basically user declining their own invite ig
                .expect(403);

            expect(response.body).toHaveProperty("message");
        });

        it("should decline the invite", async () => {
            const response = await request(app)
                .post(`/users/invites/${mock_deny_invite.id}/decline`)
                .set("Authorization", `Bearer ${lonely_token}`)
                .expect(200);

            expect(response.body).toHaveProperty("message");
        });
    });
});
