/**
 * Mock Nodemailer so tests do not send real emails.
 * Instead of connecting to Gmail SMTP, Jest will pretend the email send succeeded.
 * This keeps tests fast, safe, and independent of external services.
 */
jest.mock("nodemailer", () => ({
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true),
    }),
  }));
  
  // Import the testing utilities
  const request = require("supertest");
  const app = require("../src/app");
  
  /**
   * Test suite for authentication routes and basic server health.
   * These tests verify that the API endpoints behave correctly
   * for important validation cases.
   */
  describe("Auth and health routes", () => {
  
    /**
     * Test: Health endpoint
     *
     * Purpose:
     * Ensures the backend server is running and responding.
     * This endpoint is commonly used by load balancers,
     * monitoring systems, or deployment checks.
     *
     * Expected behavior:
     * - Returns HTTP 200
     * - Response body contains "status: ok"
     * - Response includes a timestamp field
     */
    test("GET /api/health should return status ok", async () => {
      const res = await request(app).get("/api/health");
  
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body).toHaveProperty("timestamp");
    });
  
    /**
     * Test: Email domain validation
     *
     * Purpose:
     * Ensures that only University of Florida emails
     * (ending in @ufl.edu) are allowed to register.
     *
     * Expected behavior:
     * - Request with non-UFL email should be rejected
     * - Server returns HTTP 400
     * - Error message indicates domain restriction
     */
    test("POST /auth/signup should reject non-ufl emails", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "test@gmail.com",
          password: "TestPassword123!",
        });
  
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Only @ufl.edu email addresses are allowed.");
    });
  
    /**
     * Test: Missing input validation
     *
     * Purpose:
     * Ensures the API rejects signup requests
     * when required fields are missing.
     *
     * Expected behavior:
     * - Server returns HTTP 400
     * - Error message indicates email and password are required
     */
    test("POST /auth/signup should reject missing email or password", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "",
          password: "",
        });
  
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Email and password are required.");
    });

    test("POST /auth/login should reject invalid credentials securely", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unknown@ufl.edu",
          password: "wrong-password",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("Invalid email or password.");
    });

    test("POST /auth/logout should require authentication", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .send();

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("Authentication required.");
    });

    test("PUT /auth/update should require authentication", async () => {
      const res = await request(app)
        .put("/api/auth/update")
        .send({ currentPassword: "password" });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("Authentication required.");
    });
  
  });