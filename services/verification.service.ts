
import { apiClient } from './api.client';

export const verificationService = {
  /**
   * Test if email is configured in PocketBase
   */
  async testEmailConfiguration(testEmail: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      await apiClient.pb.send("/api/openhr/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail })
      });

      return { 
        success: true, 
        message: "Test email sent! Check your inbox in 1-2 minutes." 
      };
    } catch (err: any) {
      let errorMsg = "Email test failed";
      if (err.response && err.response.message) errorMsg = err.response.message;
      else if (err.data && err.data.message) errorMsg = err.data.message;
      else if (err.message) errorMsg = err.message;
      
      return { success: false, message: errorMsg };
    }
  },

  /**
   * Get list of unverified users (Admin only)
   */
  async getUnverifiedUsers(): Promise<{ 
    success: boolean; 
    count: number; 
    users: Array<{id: string; email: string; name: string; role: string; created: string; updated: string}>; 
    error?: string 
  }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, count: 0, users: [], error: "Not authenticated" };
    }

    try {
      const response = await apiClient.pb.send("/api/openhr/unverified-users", {
        method: "GET"
      });

      return {
        success: true,
        count: response.count || 0,
        users: response.users || []
      };
    } catch (err: any) {
      let errorMsg = "Failed to fetch users";
      if (err.response?.message) errorMsg = err.response.message;
      else if (err.data?.message) errorMsg = err.data.message;
      else if (err.message) errorMsg = err.message;

      return { success: false, count: 0, users: [], error: errorMsg };
    }
  },

  /**
   * Manually verify a user (Admin only)
   */
  async manuallyVerifyUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await apiClient.pb.send("/api/openhr/admin-verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      return {
        success: true,
        message: response.message || "User verified successfully"
      };
    } catch (err: any) {
      let errorMsg = "Verification failed";
      if (err.response?.message) errorMsg = err.response.message;
      else if (err.data?.message) errorMsg = err.data.message;
      else if (err.message) errorMsg = err.message;

      return { success: false, message: errorMsg };
    }
  },

  /**
   * Check if a user has verified their email
   * Polls the server until verified or timeout
   */
  async waitForEmailVerification(
    email: string, 
    maxWaitMinutes: number = 5
  ): Promise<{ verified: boolean; timeoutMs: number }> {
    const pollIntervalMs = 10000; // Check every 10 seconds
    const maxChecks = (maxWaitMinutes * 60 * 1000) / pollIntervalMs;
    let checks = 0;

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        checks++;

        // In a real scenario, we might have a public endpoint to check status.
        // For now, this is a placeholder for the logic or relying on user interaction.
        // We resolve false if timeout reached.
        
        if (checks >= maxChecks) {
          clearInterval(checkInterval);
          resolve({ verified: false, timeoutMs: checks * pollIntervalMs });
        }
      }, pollIntervalMs);
    });
  },

  /**
   * Resend verification email to user
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      await apiClient.pb.collection('users').requestVerification(email);
      return {
        success: true,
        message: "Verification email resent. Check your inbox!"
      };
    } catch (err: any) {
      let errorMsg = "Failed to resend verification email";
      if (err.response?.message) errorMsg = err.response.message;
      else if (err.data?.message) errorMsg = err.data.message;
      else if (err.message) errorMsg = err.message;

      return { success: false, message: errorMsg };
    }
  }
};
