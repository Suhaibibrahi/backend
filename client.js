// client.js
import { registerUser, loginUser, requestPasswordReset, resetPassword } from './apiService';

async function testApi() {
  try {
    // Example: Register a new user
    const registrationResult = await registerUser("test@example.com", "Password123", "Test User");
    console.log("Registration result:", registrationResult);
    
    // Example: Log in with the new user
    const loginResult = await loginUser("test@example.com", "Password123");
    console.log("Login result:", loginResult);
    
    // Example: Request a password reset for the user
    const passwordResetRequestResult = await requestPasswordReset("test@example.com");
    console.log("Password reset request result:", passwordResetRequestResult);
    
    // Example: Reset password using a token (in a real scenario, the token comes from the reset email)
    const dummyToken = "exampleToken123";
    const passwordResetResult = await resetPassword(dummyToken, "NewPassword123");
    console.log("Password reset result:", passwordResetResult);
    
  } catch (error) {
    console.error("API error:", error);
  }
}

testApi();
