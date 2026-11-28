interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email sender.
 *
 * Resend is wired: set RESEND_API_KEY and EMAIL_FROM. Without a key it logs in
 * development and throws in production, so password reset and verification
 * never lose emails silently.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Dashild <onboarding@resend.dev>",
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        "Resend rejected the email: " +
          response.status +
          " " +
          (await response.text()),
      );
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[dashild] email to " +
        message.to +
        ": " +
        message.subject +
        "\n" +
        message.text,
    );
    return;
  }

  throw new Error(
    "No email provider configured. Set RESEND_API_KEY or implement sendEmail in src/lib/email.ts.",
  );
}
