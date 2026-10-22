type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  html?: string;
};

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
  html,
}: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM in the Convex deployment.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(html ? { html } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}.`);
  }
}
