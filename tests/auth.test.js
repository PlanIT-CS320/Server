import mongoose from "mongoose";
Object.keys(mongoose.connection.models).forEach(
	(key) => delete mongoose.connection.models[key],
);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import { genSalt, hash } from "bcrypt";
import User from "../schema/User";

describe("Authentication routes", async () => {
	const user = new User({
		fName: "test",
		lName: "user",
		username: "testuser",
		email: "test@example.com",
		password: await hash("password123", await genSalt(10)),
	});

	beforeAll(async () => {
		await mongoose.connect(
			process.env.MONGO_URL || "mongodb://localhost:27017/test_db",
		);
		await mongoose.connection.dropCollection("users");
		await user.save();
	});

	afterAll(async () => {
		await mongoose.connection.dropDatabase();
		await mongoose.connection.close();
	});

	describe("POST /auth/login", () => {
		it("should log in as an existing user with valid credentials", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "test@example.com",
					password: "password123",
				})
				.expect(200);

			expect(response.body).toHaveProperty("token");
		});

		it("should deny login for an existing user with an incorrect password", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "test@example.com",
					password: "password1234",
				})
				.expect(401);

			expect(response.body).not.toHaveProperty("token");
		});

		it("should deny login for an email that does not exist", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "test2@example.com",
					password: "password123",
				})
				.expect(404);

			expect(response.body).not.toHaveProperty("token");
		});

		it("requires email to exist", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
					password: "password123",
				})
				.expect(400);

			expect(response.body).not.toHaveProperty("token");
		});

		it("requires password to exist", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "password123",
				})
				.expect(400);

			expect(response.body).not.toHaveProperty("token");
		});

		it("requires email and password to be strings", async () => {
			const response = await request(app)
				.post("/auth/login")
				.send({
                    email: {
                        $exists: true,
                    },
					password: "password123",
				})
				.expect(400);

			expect(response.body).not.toHaveProperty("token");
		});
	});

    describe("POST /auth/register", () => {
		it("should register a new user with valid credentials", async () => {
			const response = await request(app)
				.post("/auth/register")
				.send({
                    firstName: "test",
                    lastName: "user",
                    username: "newuser",
					email: "testnewuser@example.com",
					password: "password123",
				})
				.expect(201);

			expect(response.body).toHaveProperty("token");
		});

		it("should not allow registering the same email twice", async () => {
			const response = await request(app)
				.post("/auth/register")
				.send({
                    firstName: "test",
                    lastName: "user",
                    username: "newuser2",
					email: "testnewuser2@example.com",
					password: "password123",
				})
				.expect(201);

			expect(response.body).toHaveProperty("token");

			const response2 = await request(app)
				.post("/auth/register")
				.send({
                    firstName: "test",
                    lastName: "user",
                    username: "newuser2",
					email: "testnewuser2@example.com",
					password: "password123",
				})
				.expect(409);

			expect(response2.body).not.toHaveProperty("token");
		});
    });
});
