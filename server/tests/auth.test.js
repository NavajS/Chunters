const request = require('supertest');
const app = require('../src/app');

describe('Auth and health routes', () => {
    test('GET /api/health should return status ok', async () => {
        const res = await request(app).get('/api/health');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
    });

    test('POST /auth/signup should reject non-ufl emails', async () => {
        const res = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@gmail.com',
                password: 'TestPassword123!'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Only ufl.edu email addresses are allowed.');
    });

    test('POST /auth/signup should reject missing email or password', async () => {
        const res = await request(app)
            .post('/auth/signup')
            .send({
                email: '',
                password: ''
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Email and password are required.');
    });
});