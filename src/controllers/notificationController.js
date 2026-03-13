import { sendEmail } from "../services/emailService.js";

export async function sendTestNotification(req, res, next) {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject || !message) {
      return res.status(400).json({ message: "to, subject, and message are required" });
    }
    const info = await sendEmail({
      to,
      subject,
      htmlContent: `<p>${message}</p>`,
    });
    res.json({ message: "Notification sent", info });
  } catch (err) {
    next(err);
  }
}

