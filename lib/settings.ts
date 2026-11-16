/** Admin-editable settings stored in app_settings (migration 008). */
import { getPool } from "./db";
import { LEAD_ACK, isTheme, type EmailContent, type ThemeId } from "./email-templates";

export interface EmailSettings {
  autoReply: boolean;          // send the thank-you to every new lead with an email
  ackTheme: ThemeId;
  ack: EmailContent;
  testTo: string;              // where "Send test" goes (your own inbox)
}

export const EMAIL_DEFAULTS: EmailSettings = { autoReply: true, ackTheme: LEAD_ACK.theme, ack: LEAD_ACK.content, testTo: "" };

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const { rows } = await getPool().query<{ value: Partial<EmailSettings> }>(
      `SELECT value FROM app_settings WHERE key = 'email'`);
    const v = rows[0]?.value ?? {};
    return {
      autoReply: typeof v.autoReply === "boolean" ? v.autoReply : EMAIL_DEFAULTS.autoReply,
      ackTheme: v.ackTheme && isTheme(v.ackTheme) ? v.ackTheme : EMAIL_DEFAULTS.ackTheme,
      ack: v.ack?.subject && v.ack?.body ? { ...EMAIL_DEFAULTS.ack, ...v.ack } : EMAIL_DEFAULTS.ack,
      testTo: typeof v.testTo === "string" ? v.testTo : "",
    };
  } catch {
    return EMAIL_DEFAULTS; // table missing / DB down → behave as before
  }
}

export async function saveEmailSettings(patch: Partial<EmailSettings>): Promise<EmailSettings> {
  const next = { ...(await getEmailSettings()), ...patch };
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('email', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(next)]);
  return next;
}
