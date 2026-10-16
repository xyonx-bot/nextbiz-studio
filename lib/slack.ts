/**
 * Slack notify — incoming webhook, fire-and-forget (technical-plan §7):
 * the lead is already saved when this runs; a Slack failure must never
 * lose it or fail the request. Never throws.
 */
export async function notifySlack(lead: {
  name: string;
  phone?: string | null;
  email?: string | null;
  service?: string | null;
  budget?: string | null;
  message: string;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn("[slack] SLACK_WEBHOOK_URL not set — ping skipped");
    return;
  }
  const fields = [
    { label: "Service", value: lead.service ?? "—" },
    { label: "Budget", value: lead.budget ?? "—" },
    { label: "Phone", value: lead.phone ?? "—" },
    { label: "Email", value: lead.email ?? "—" },
  ];
  const text = [
    `*New lead — ${lead.name}*`,
    ...fields.map((f) => `• ${f.label}: ${f.value}`),
    "",
    `> ${lead.message.slice(0, 500)}`,
  ].join("\n");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error("[slack] webhook responded", res.status);
  } catch (err) {
    console.error("[slack] ping failed (lead already saved):", err);
  }
}
