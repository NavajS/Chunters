// Prevent any real database connections during tests.
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
}));

// Mock Nodemailer so tests do not send real emails.
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

const request = require("supertest");
const app = require("../src/app");

describe("Auth and health routes", () => {

  test("GET /api/health should return status ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("timestamp");
  });

  test("POST /api/auth/signup should reject non-ufl emails", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "test@gmail.com",
        password: "TestPassword123!",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Only @ufl.edu email addresses are allowed.");
  });

  test("POST /api/auth/signup should reject missing email or password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "",
        password: "",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email and password are required.");
  });

  test("POST /api/auth/signup should reject passwords shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "gator@ufl.edu",
        password: "short",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  test("POST /api/auth/login should reject missing credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "", password: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email and password are required.");
  });

});
