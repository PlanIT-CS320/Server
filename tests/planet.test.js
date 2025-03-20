import mongoose from "mongoose";
Object.keys(mongoose.connection.models).forEach(
	(key) => delete mongoose.connection.models[key],
);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import jwt from "jsonwebtoken";
import { genSalt, hash } from "bcrypt";
import User from "../schema/User";
import Planet from "../schema/Planet";
import PlanetCollaborator from "../schema/PlanetCollaborator";

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
		{ expiresIn: "15m" },
	);

	reg_token = jwt.sign(
		{
			userId: reg_user._id,
			userEmail: reg_user.email,
			role: reg_user.role,
		},
		secret,
		{ expiresIn: "15m" },
	);

    lonely_token = jwt.sign(
		{
			userId: lonely_user._id,
			userEmail: lonely_user.email,
			role: lonely_user.role,
		},
		secret,
		{ expiresIn: "15m" },
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
    })

    let planetUser = new PlanetCollaborator({
        role: "collaborator",
        planetId: null,
        userId: null,
    })

	beforeAll(async () => {
		await mongoose.connect(
			process.env.MONGO_URL || "mongodb://localhost:27017/test_db",
		);
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
			const response = await request(app)
				.get(`/planets/${planet.id}`)
				.expect(401);
            
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
});
