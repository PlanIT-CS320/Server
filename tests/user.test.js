import mongoose from "mongoose";
Object.keys(mongoose.connection.models).forEach(
	(key) => delete mongoose.connection.models[key],
);

import { genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

	let token;

	beforeAll(async () => {
		await mongoose.connect(
			process.env.MONGO_URL || "mongodb://localhost:27017/test_db",
		);
		await mongoose.connection.dropCollection("users");
		await user.save();

		token = jwt.sign(
			{
				userId: user._id,
				userEmail: user.email,
				role: user.role,
			},
			secret,
			{ expiresIn: "15m" },
		);
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

			const response = await request(app)
				.get(`/users/${user.id}`)
				.expect("Content-Type", /json/)
				.expect(401);
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

			expect(response.body).toHaveProperty("message", "User has no planets.");
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

			expect(response.body).not.toHaveProperty(
				"message",
				"User has no planets.",
			);
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

			expect(response.body).toHaveProperty(
				"message",
				"Successfully retrieved invites.",
			);
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

			expect(response.body).not.toHaveProperty(
				"message",
				"Successfully retrieved invites.",
			);
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

			expect(response.body).toHaveProperty(
				"message",
				"User updated successfully.",
			);
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

			expect(response.body).not.toHaveProperty(
				"message",
				"User updated successfully.",
			);
		});
	});
});