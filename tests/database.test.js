import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import app from '../server' // Adjust path to your Express app

describe('User API', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/test_db')
    })

    afterAll(async () => {
        await mongoose.connection.dropDatabase()
        await mongoose.connection.close()
    })

    afterEach(async () => {
        await mongoose.connection.dropCollection('users')
    })
 
    describe('POST /api/users', () => {
        it('should create a new user', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            }

            const response = await request(app)
                .post('/api/users')
                .send(userData)
                .expect(201)

            expect(response.body).toHaveProperty('username', userData.username)
            expect(response.body).toHaveProperty('email', userData.email)
        })
    })
})