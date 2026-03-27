import axios from "axios";
import { env } from "../config/env.js";

const BREEVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail({ to, subject, htmlContent }) {
  if (!env.brevoApiKey || !env.brevoFromEmail) {
    console.warn("Brevo API key or from email not configured; email will not be sent.");
    return { ok: false, skipped: true, reason: "BREVO_NOT_CONFIGURED" };
  }

  const payload = {
    sender: {
      name: env.brevoFromName || undefined,
      email: env.brevoFromEmail,
    },
    to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
    subject,
    htmlContent,
  };

  try {
    const response = await axios.post(BREEVO_API_URL, payload, {
      headers: {
        "api-key": env.brevoApiKey,
        "Content-Type": "application/json",
      },
    });
    console.log("Brevo email sent:", response.status, response.statusText);
    return { ok: true, provider: "brevo", data: response.data };
  } catch (error) {
    if (error.response) {
      console.error("Brevo email error:", error.response.status, error.response.data);
      return {
        ok: false,
        provider: "brevo",
        status: error.response.status,
        data: error.response.data,
      };
    } else {
      console.error("Brevo email error:", error.message);
      return { ok: false, provider: "brevo", message: error.message };
    }
  }
}

