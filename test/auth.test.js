// test/auth.test.js

const request = require("supertest");
const { MongoClient } = require("mongodb");
const app = require("../server"); // Ensure your server.js exports the Express app

describe("Authentication Endpoints", () => {
  let testConnection;
  let testDb;

  beforeAll(async () => {
    // Connect using a separate connection for testing (optional, but ensures a test-specific connection)
    testConnection = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    testDb = testConnection.db("SQ23rdApp"); // You might switch to a dedicated test database here.
    // Override the app's db with this test database if desired.
    app.locals.db = testDb;
  });

  beforeEach(async () => {
    // Clean up any existing test user to ensure a fresh environment.
    await testDb.collection("users").deleteMany({ personalEmail: "testuser@example.com" });
  });

  afterAll(async () => {
    // Close the test connection.
    await testConnection.close();
    // Also close the connection stored on app.locals (from server.js)
    if (app.locals.client) {
      await app.locals.client.close();
    }
  });

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/register")
      .send({
        email: "testuser@example.com",
        password: "Test1234",
        name: "Test User"
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("message");
  });

  it("should login an existing user", async () => {
    // First, register the user.
    const registerRes = await request(app)
      .post("/register")
      .send({
        email: "testuser@example.com",
        password: "Test1234",
        name: "Test User"
      });
    expect(registerRes.statusCode).toEqual(201);

    // Update the user's status to "approved" so that login is allowed.
    await testDb.collection("users").updateOne(
      { loginEmail: "testuser@sq23rd.com" },
      { $set: { status: "approved" } }
    );

    // Attempt to login using the auto-generated login email.
    const res = await request(app)
      .post("/login")
      .send({
        email: "testuser@sq23rd.com", // The auto-generated login email for testuser@example.com
        password: "Test1234"
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
  });
});
