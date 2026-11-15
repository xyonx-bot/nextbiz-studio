#!/usr/bin/env python3
"""Generate the free n8n workflow downloads served from /resources/n8n/*.json.
Each workflow keeps every setting in ONE Code node called CONFIG so a
beginner edits one place. Re-run after editing: python3 scripts/n8n/build-workflows.py
"""
import json, uuid, os

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "resources", "n8n")
NS = uuid.UUID("6f1c2a52-6c4f-4d55-9a57-0f5b1e7c9a10")
def uid(*k): return str(uuid.uuid5(NS, "/".join(k)))

def node(wf, name, typ, ver, pos, params, **extra):
    n = {"parameters": params, "id": uid(wf, name), "name": name, "type": typ, "typeVersion": ver, "position": pos}
    n.update(extra)
    return n

def code(wf, name, pos, js):
    return node(wf, name, "n8n-nodes-base.code", 2, pos, {"jsCode": js.strip() + "\n"})

def note(wf, name, pos, text, w=420, h=300):
    return node(wf, name, "n8n-nodes-base.stickyNote", 1, pos, {"content": text.strip(), "width": w, "height": h})

def http_json(wf, name, pos, auth=True):
    p = {"method": "POST", "url": "={{ $json.url }}", "sendBody": True, "contentType": "json",
         "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.body) }}", "options": {"timeout": 30000}}
    if auth:
        p["sendHeaders"] = True
        p["headerParameters"] = {"parameters": [{"name": "Authorization", "value": "=Bearer {{ $('CONFIG').first().json.TOKEN }}"}]}
    return node(wf, name, "n8n-nodes-base.httpRequest", 4.2, pos, p, onError="continueRegularOutput")

def cond_eq(cid, left, right):
    return {"id": cid, "leftValue": left, "rightValue": right, "operator": {"type": "string", "operation": "equals"}}

def if_node(wf, name, pos, conds):
    return node(wf, name, "n8n-nodes-base.if", 2, pos, {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
                       "conditions": conds, "combinator": "and"},
        "looseTypeValidation": True})

def respond(wf, name, pos, body, codeN=200, kind="text"):
    p = {"respondWith": kind, "responseBody": body, "options": {"responseCode": codeN}}
    return node(wf, name, "n8n-nodes-base.respondToWebhook", 1, pos, p)

def meta_webhook(wf, path, verify_token):
    """GET verify + POST events on one path (Meta webhook contract)."""
    return [
        node(wf, "Meta Webhook", "n8n-nodes-base.webhook", 2, [0, 300],
             {"multipleMethods": True, "httpMethod": ["GET", "POST"], "path": path,
              "responseMode": "responseNode", "options": {}}, webhookId=uid(wf, "hook")),
        if_node(wf, "Verify Token OK?", [240, 160], [
            cond_eq("v1", "={{ $json.query['hub.mode'] }}", "subscribe"),
            cond_eq("v2", "={{ $json.query['hub.verify_token'] }}", verify_token)]),
        respond(wf, "Respond Challenge", [480, 80], "={{ $json.query['hub.challenge'] }}"),
        respond(wf, "Respond 403", [480, 240], "Forbidden", 403),
        respond(wf, "Ack 200 to Meta", [240, 420], "EVENT_RECEIVED"),
    ]

def meta_connections(first_after_ack):
    return {
        "Meta Webhook": {"main": [[{"node": "Verify Token OK?", "type": "main", "index": 0}],
                                  [{"node": "Ack 200 to Meta", "type": "main", "index": 0}]]},
        "Verify Token OK?": {"main": [[{"node": "Respond Challenge", "type": "main", "index": 0}],
                                      [{"node": "Respond 403", "type": "main", "index": 0}]]},
        "Ack 200 to Meta": {"main": [[{"node": first_after_ack, "type": "main", "index": 0}]]},
    }

def chain(*names):
    return {a: {"main": [[{"node": b, "type": "main", "index": 0}]]} for a, b in zip(names, names[1:])}

def save(slug, name, nodes, connections):
    wf = {"name": name, "nodes": nodes, "connections": connections, "active": False,
          "settings": {"executionOrder": "v1"}, "pinData": {},
          "meta": {"templateCredsSetupCompleted": True, "source": "nextbizstudio.com/resources"},
          "tags": []}
    with open(os.path.join(OUT, f"{slug}.json"), "w") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False); f.write("\n")
    print("wrote", slug)

# ─────────────────────────────────────────────────────────────
# 1 · Instagram comment keyword → public reply + DM with a link button
# ─────────────────────────────────────────────────────────────
W = "ig-comment-to-dm"
CONFIG_1 = r"""
// ── EDIT THESE ──────────────────────────────────────────────
return [{ json: {
  GRAPH: 'https://graph.instagram.com/v23.0',
  TOKEN: 'PASTE_YOUR_INSTAGRAM_ACCESS_TOKEN',
  IG_USER_ID: 'PASTE_YOUR_INSTAGRAM_USER_ID', // so the bot never answers itself
  // One row per keyword. Comment must CONTAIN the keyword (any case).
  RULES: [
    {
      keyword: 'GUIDE',
      public_reply: 'Sent! Check your DMs 📩',
      dm_text: 'Here you go! 🎁 Your free guide is ready — tap below to open it 👇',
      button_title: 'Open the guide',
      url: 'https://example.com/your-guide',
    },
    {
      keyword: 'PRICE',
      public_reply: 'Just DMed you our price list 🙌',
      dm_text: 'Thanks for asking! Here is our full price list 👇',
      button_title: 'See prices',
      url: 'https://example.com/prices',
    },
  ],
} }];
"""
PLAN_1 = r"""
// Turns Instagram comment events into API calls (public reply + private DM).
const cfg = $('CONFIG').first().json;
const body = $('Meta Webhook').first().json.body || {};
const out = [];
for (const entry of body.entry || []) {
  for (const change of entry.changes || []) {
    if (change.field !== 'comments') continue;
    const v = change.value || {};
    if (!v.id || !v.text) continue;
    if (v.from && String(v.from.id) === String(cfg.IG_USER_ID)) continue; // our own reply
    const text = String(v.text).toUpperCase();
    const rule = (cfg.RULES || []).find(r => text.includes(String(r.keyword).toUpperCase()));
    if (!rule) continue;
    out.push({ json: { step: 'public reply', url: `${cfg.GRAPH}/${v.id}/replies`,
      body: { message: rule.public_reply } } });
    out.push({ json: { step: 'private DM', url: `${cfg.GRAPH}/me/messages`,
      body: {
        recipient: { comment_id: v.id },
        message: { attachment: { type: 'template', payload: {
          template_type: 'button', text: rule.dm_text,
          buttons: [{ type: 'web_url', url: rule.url, title: rule.button_title }],
        } } },
      } } });
  }
}
return out;
"""
NOTE_1 = """
## Instagram comment → DM
**What it does:** someone comments a keyword (e.g. GUIDE) → they get a public reply *and* a DM with a link button.

**Setup (10 min)**
1. Edit **CONFIG**: paste your Instagram access token, your IG user ID and your keywords/links.
2. In **Verify Token OK?** replace `CHANGE_ME_VERIFY_TOKEN` with any secret word.
3. Activate the workflow, copy the **Production URL** of *Meta Webhook*.
4. Meta app → Instagram → Webhooks: paste that URL + the same secret word, subscribe to **comments**.

Instagram allows ONE private reply per comment, within 7 days. Free resource from nextbizstudio.com
"""
nodes = meta_webhook(W, "ig-comment-to-dm", "CHANGE_ME_VERIFY_TOKEN") + [
    code(W, "CONFIG", [480, 420], CONFIG_1),
    code(W, "Plan Replies", [720, 420], PLAN_1),
    http_json(W, "Send to Instagram", [960, 420]),
    note(W, "Read me", [-480, 0], NOTE_1, 440, 420),
]
save(W, "Instagram Comment → DM (NextBiz Studio)", nodes,
     {**meta_connections("CONFIG"), **chain("CONFIG", "Plan Replies", "Send to Instagram")})

# ─────────────────────────────────────────────────────────────
# 2 · Instagram DM menu — "START" → button menu, postbacks → answers
# ─────────────────────────────────────────────────────────────
W = "ig-dm-menu"
CONFIG_2 = r"""
// ── EDIT THESE ──────────────────────────────────────────────
return [{ json: {
  GRAPH: 'https://graph.instagram.com/v23.0',
  TOKEN: 'PASTE_YOUR_INSTAGRAM_ACCESS_TOKEN',
  IG_USER_ID: 'PASTE_YOUR_INSTAGRAM_USER_ID',
  // Words that open the menu (exact match, any case). Other messages are left for you.
  TRIGGERS: ['START', 'MENU', 'HI', 'HELLO'],
  // Optional: Slack/Discord/any webhook URL to ping when someone asks to work with you.
  NOTIFY_URL: '',
  MENU: {
    text: 'Hey! 👋 What can we help you with?',
    buttons: [   // max 3
      { type: 'postback', title: 'Free resources', payload: 'RESOURCES' },
      { type: 'web_url',  title: 'Visit website',  url: 'https://example.com' },
      { type: 'postback', title: 'Work with us',   payload: 'WORK' },
    ],
  },
  // What each button/quick-reply payload answers with.
  ANSWERS: {
    RESOURCES: { text: 'Pick one 👇', buttons: [
      { type: 'web_url', title: 'Prompt packs',   url: 'https://example.com/prompts' },
      { type: 'web_url', title: 'n8n workflows',  url: 'https://example.com/n8n' },
      { type: 'postback', title: '← Main menu',   payload: 'MENU' },
    ] },
    WORK: { text: 'Love that! What do you need?', quick_replies: [
      { title: 'Website',        payload: 'LEAD_WEBSITE' },
      { title: 'Automation',     payload: 'LEAD_AUTOMATION' },
      { title: 'Marketing',      payload: 'LEAD_MARKETING' },
    ] },
    LEAD: { text: 'Perfect 🙌 Reply with your name and WhatsApp number (or email) and we will reach out within a day.' },
  },
} }];
"""
PLAN_2 = r"""
// Decides the reply for each incoming DM / button tap.
const cfg = $('CONFIG').first().json;
const body = $('Meta Webhook').first().json.body || {};
const out = [];
const send = (to, message) => out.push({ json: { kind: 'send', url: `${cfg.GRAPH}/me/messages`,
  body: { recipient: { id: to }, message } } });
const asMessage = (a) => {
  if (a.buttons) return { attachment: { type: 'template', payload: {
    template_type: 'button', text: a.text, buttons: a.buttons.slice(0, 3) } } };
  if (a.quick_replies) return { text: a.text, quick_replies: a.quick_replies.slice(0, 13)
    .map(q => ({ content_type: 'text', title: q.title, payload: q.payload })) };
  return { text: a.text };
};
const triggers = (cfg.TRIGGERS || []).map(t => String(t).toUpperCase());
for (const entry of body.entry || []) {
  for (const m of entry.messaging || []) {
    const from = m.sender && String(m.sender.id);
    if (!from || from === String(cfg.IG_USER_ID)) continue;   // our own messages
    if (m.message && m.message.is_echo) continue;             // echoes of what we sent
    const payload = (m.postback && m.postback.payload)
      || (m.message && m.message.quick_reply && m.message.quick_reply.payload) || '';
    const text = String((m.message && m.message.text) || '').trim().toUpperCase();
    let key = payload || (triggers.includes(text) ? 'MENU' : '');
    if (!key) continue;                                        // normal chat → leave it for a human
    if (key === 'MENU') { send(from, asMessage(cfg.MENU)); continue; }
    if (key.startsWith('LEAD_')) {
      send(from, asMessage(cfg.ANSWERS.LEAD));
      if (cfg.NOTIFY_URL) out.push({ json: { kind: 'notify', url: cfg.NOTIFY_URL,
        body: { text: `New Instagram lead: user ${from} wants ${key.slice(5).toLowerCase()}`,
                content: `New Instagram lead: user ${from} wants ${key.slice(5).toLowerCase()}` } } });
      continue;
    }
    const a = (cfg.ANSWERS || {})[key];
    if (a) send(from, asMessage(a));
  }
}
return out;
"""
NOTE_2 = """
## Instagram DM menu ("DM START")
**What it does:** someone DMs START (or taps a button) → they get a menu with buttons. Buttons open links or answer with the next step; *Work with us* asks what they need and pings you.

**Setup (10 min)**
1. Edit **CONFIG**: token, IG user ID, your menu text, buttons and links.
2. In **Verify Token OK?** replace `CHANGE_ME_VERIFY_TOKEN` with a secret word.
3. Activate, copy *Meta Webhook* Production URL into your Meta app → Instagram → Webhooks; subscribe to **messages** and **messaging_postbacks**.

Normal messages that are not a trigger word are ignored, so real chats are never interrupted. Free resource from nextbizstudio.com
"""
nodes = meta_webhook(W, "ig-dm-menu", "CHANGE_ME_VERIFY_TOKEN") + [
    code(W, "CONFIG", [480, 420], CONFIG_2),
    code(W, "Plan Replies", [720, 420], PLAN_2),
    if_node(W, "Is Notify?", [960, 420], [cond_eq("n1", "={{ $json.kind }}", "notify")]),
    http_json(W, "Notify Me", [1200, 340], auth=False),
    http_json(W, "Send to Instagram", [1200, 500]),
    note(W, "Read me", [-480, 0], NOTE_2, 440, 420),
]
save(W, "Instagram DM Menu — START (NextBiz Studio)", nodes, {
    **meta_connections("CONFIG"), **chain("CONFIG", "Plan Replies", "Is Notify?"),
    "Is Notify?": {"main": [[{"node": "Notify Me", "type": "main", "index": 0}],
                            [{"node": "Send to Instagram", "type": "main", "index": 0}]]}})

# ─────────────────────────────────────────────────────────────
# 3 · WhatsApp Cloud API — greeting → list menu → answers
# ─────────────────────────────────────────────────────────────
W = "whatsapp-menu"
CONFIG_3 = r"""
// ── EDIT THESE ──────────────────────────────────────────────
return [{ json: {
  GRAPH: 'https://graph.facebook.com/v23.0',
  TOKEN: 'PASTE_YOUR_WHATSAPP_ACCESS_TOKEN',
  // Send the menu when the message is one of these words…
  TRIGGERS: ['HI', 'HELLO', 'HEY', 'MENU', 'START', 'PRICE', 'PRICES'],
  // …or on ANY text message (true = every message gets the menu).
  MENU_ON_ANY_TEXT: false,
  MENU: {
    header: 'Welcome to Our Shop 👋',
    text: 'How can we help? Tap below to see options.',
    button: 'View options',
    rows: [   // max 10, title max 24 chars
      { id: 'PRICES',   title: 'Prices',            description: 'Our full price list' },
      { id: 'TIMINGS',  title: 'Timings & location', description: 'When and where to find us' },
      { id: 'BOOK',     title: 'Book an appointment', description: 'Pick a time that suits you' },
      { id: 'HUMAN',    title: 'Talk to a person',  description: 'We reply within working hours' },
    ],
  },
  ANSWERS: {
    PRICES:  'Here are our prices:\n• Service A — ₹499\n• Service B — ₹999\nReply MENU any time.',
    TIMINGS: 'We are open Mon–Sat, 10am–8pm.\n📍 https://maps.google.com/?q=your+shop',
    BOOK:    'Book here 👉 https://example.com/book — or reply with a day and time that suits you.',
    HUMAN:   'Sure! A team member will reply here shortly 🙏',
  },
} }];
"""
PLAN_3 = r"""
// Builds WhatsApp replies: list menu for greetings, text answers for menu taps.
const cfg = $('CONFIG').first().json;
const body = $('Meta Webhook').first().json.body || {};
const out = [];
const triggers = (cfg.TRIGGERS || []).map(t => String(t).toUpperCase());
for (const entry of body.entry || []) {
  for (const change of entry.changes || []) {
    if (change.field !== 'messages') continue;
    const v = change.value || {};
    const phoneId = v.metadata && v.metadata.phone_number_id;
    for (const msg of v.messages || []) {
      const to = msg.from;
      if (!phoneId || !to) continue;
      const url = `${cfg.GRAPH}/${phoneId}/messages`;
      const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
      const reply = msg.interactive && (msg.interactive.list_reply || msg.interactive.button_reply);
      if (reply) {
        const a = (cfg.ANSWERS || {})[reply.id];
        if (a) out.push({ json: { url, body: { ...base, type: 'text', text: { body: a } } } });
        continue;
      }
      if (msg.type !== 'text') continue;
      const text = String((msg.text && msg.text.body) || '').trim().toUpperCase();
      if (!cfg.MENU_ON_ANY_TEXT && !triggers.includes(text)) continue;
      const M = cfg.MENU;
      out.push({ json: { url, body: { ...base, type: 'interactive', interactive: {
        type: 'list',
        header: { type: 'text', text: M.header },
        body: { text: M.text },
        action: { button: M.button, sections: [{ title: 'Menu',
          rows: M.rows.slice(0, 10).map(r => ({ id: r.id, title: r.title.slice(0, 24), description: (r.description || '').slice(0, 72) })) }] },
      } } } });
    }
  }
}
return out;
"""
NOTE_3 = """
## WhatsApp auto-reply menu
**What it does:** customer says "hi" → gets a tappable menu (prices, timings, booking, talk to a person). Each option replies instantly.

**Setup (15 min)** — needs the WhatsApp Cloud API (Meta developer app with WhatsApp added).
1. Edit **CONFIG**: access token, menu rows and answers.
2. In **Verify Token OK?** replace `CHANGE_ME_VERIFY_TOKEN` with a secret word.
3. Activate, copy *Meta Webhook* Production URL → Meta app → WhatsApp → Configuration → Webhook; subscribe to **messages**.

Replies within 24h of the customer's message are free. Free resource from nextbizstudio.com
"""
nodes = meta_webhook(W, "whatsapp-menu", "CHANGE_ME_VERIFY_TOKEN") + [
    code(W, "CONFIG", [480, 420], CONFIG_3),
    code(W, "Plan Replies", [720, 420], PLAN_3),
    http_json(W, "Send to WhatsApp", [960, 420]),
    note(W, "Read me", [-480, 0], NOTE_3, 440, 420),
]
save(W, "WhatsApp Auto-Reply Menu (NextBiz Studio)", nodes,
     {**meta_connections("CONFIG"), **chain("CONFIG", "Plan Replies", "Send to WhatsApp")})

# ─────────────────────────────────────────────────────────────
# 4 · Website form → Telegram alert (instant lead notifications)
# ─────────────────────────────────────────────────────────────
W = "lead-to-telegram"
CONFIG_4 = r"""
// ── EDIT THESE ──────────────────────────────────────────────
return [{ json: {
  TELEGRAM_BOT_TOKEN: 'PASTE_BOT_TOKEN_FROM_BOTFATHER',
  TELEGRAM_CHAT_ID: 'PASTE_YOUR_CHAT_ID',
  SITE_NAME: 'My Website',
} }];
"""
PLAN_4 = r"""
// Validates the form post and builds the Telegram message.
const cfg = $('CONFIG').first().json;
const raw = $('Form Webhook').first().json.body || {};
const clean = (v, n = 500) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).trim().slice(0, n);
const lead = { name: clean(raw.name, 120), email: clean(raw.email, 160), phone: clean(raw.phone, 30),
  service: clean(raw.service, 120), message: clean(raw.message, 2000) };
const ok = lead.name.length >= 2 && (lead.email.includes('@') || lead.phone.length >= 7);
const lines = [`🔔 <b>New lead — ${clean(cfg.SITE_NAME, 60)}</b>\n`,
  `<b>Name:</b> ${lead.name}`,
  lead.phone && `<b>Phone:</b> ${lead.phone}`,
  lead.email && `<b>Email:</b> ${lead.email}`,
  lead.service && `<b>Wants:</b> ${lead.service}`,
  lead.message && `\n${lead.message}`].filter(Boolean);
return [{ json: { ok: ok ? 'yes' : 'no', lead,
  url: `https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/sendMessage`,
  body: { chat_id: cfg.TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML' } } }];
"""
NOTE_4 = """
## Website form → Telegram alert
**What it does:** your site's contact form posts to this workflow → you get an instant Telegram message with the lead's name, phone, email and message.

**Setup (5 min)**
1. Telegram → @BotFather → /newbot → copy the token. Message your bot once, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your chat id.
2. Paste both into **CONFIG**.
3. Activate, and point your form (POST, JSON) at the *Form Webhook* Production URL. Fields: name, email, phone, service, message.

Works with any site builder that can send a webhook. Free resource from nextbizstudio.com
"""
nodes = [
    node(W, "Form Webhook", "n8n-nodes-base.webhook", 2, [0, 300],
         {"httpMethod": "POST", "path": "website-lead", "responseMode": "responseNode", "options": {}},
         webhookId=uid(W, "hook")),
    code(W, "CONFIG", [240, 300], CONFIG_4),
    code(W, "Check & Format", [480, 300], PLAN_4),
    if_node(W, "Valid Lead?", [720, 300], [cond_eq("ok", "={{ $json.ok }}", "yes")]),
    http_json(W, "Send Telegram Alert", [960, 220], auth=False),
    respond(W, "Respond OK", [1200, 220], '={{ JSON.stringify({ ok: true }) }}', 200, "json"),
    respond(W, "Respond 422", [960, 400], '={{ JSON.stringify({ ok: false, error: "Please add your name and an email or phone number." }) }}', 422, "json"),
    note(W, "Read me", [-480, 0], NOTE_4, 440, 400),
]
save(W, "Website Lead → Telegram Alert (NextBiz Studio)", nodes, {
    **chain("Form Webhook", "CONFIG", "Check & Format", "Valid Lead?"),
    "Valid Lead?": {"main": [[{"node": "Send Telegram Alert", "type": "main", "index": 0}],
                             [{"node": "Respond 422", "type": "main", "index": 0}]]},
    **chain("Send Telegram Alert", "Respond OK")})

# ─────────────────────────────────────────────────────────────
# 5 · Daily AI content ideas → Telegram
# ─────────────────────────────────────────────────────────────
W = "daily-content-ideas"
CONFIG_5 = r"""
// ── EDIT THESE ──────────────────────────────────────────────
return [{ json: {
  // Any OpenAI-compatible API: OpenAI, OpenRouter, Groq, Together…
  AI_URL: 'https://api.openai.com/v1/chat/completions',
  TOKEN: 'PASTE_YOUR_AI_API_KEY',
  MODEL: 'gpt-4o-mini',
  TELEGRAM_BOT_TOKEN: 'PASTE_BOT_TOKEN_FROM_BOTFATHER',
  TELEGRAM_CHAT_ID: 'PASTE_YOUR_CHAT_ID',
  BUSINESS: 'a home bakery in Kolkata selling custom cakes and cookies',
  AUDIENCE: 'young parents and office teams ordering for celebrations',
  LANGUAGE: 'English with a little Hinglish',
} }];
"""
BUILD_5 = r"""
// Builds today's AI request (a different content angle each weekday).
const cfg = $('CONFIG').first().json;
const angles = ['behind the scenes', 'customer story or result', 'myth vs fact', 'quick tip', 'offer or announcement', 'day in the life', 'answering a common question'];
const angle = angles[new Date().getDay()];
const prompt = `You plan Instagram reels for ${cfg.BUSINESS}. Audience: ${cfg.AUDIENCE}. Language: ${cfg.LANGUAGE}.
Today's angle: ${angle}.
Give 3 reel ideas. For each: a hook under 9 words, 4 shots to film on a phone, on-screen text, and a one-line caption ending with a call to action to comment a keyword.
Keep it short and specific. Plain text, no markdown tables.`;
return [{ json: { angle, url: cfg.AI_URL, body: { model: cfg.MODEL, temperature: 0.9,
  messages: [{ role: 'user', content: prompt }] } } }];
"""
FORMAT_5 = r"""
// Turns the AI answer into a Telegram message.
const cfg = $('CONFIG').first().json;
const r = $input.first().json;
const text = (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content)
  || (r.error ? `AI error: ${r.error.message || JSON.stringify(r.error)}` : 'No answer from the AI today.');
const angle = $('Build AI Request').first().json.angle;
return [{ json: { url: `https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/sendMessage`,
  body: { chat_id: cfg.TELEGRAM_CHAT_ID, text: `🎬 Today's reel ideas (${angle})\n\n${text}`.slice(0, 4000) } } }];
"""
NOTE_5 = """
## Daily AI reel ideas → Telegram
**What it does:** every morning at 9 you get 3 fresh reel ideas for your business on Telegram — hook, shots, on-screen text and caption. A different angle each weekday.

**Setup (5 min)**
1. Get an API key (OpenAI, OpenRouter or Groq) and a Telegram bot token + chat id (see the Lead → Telegram workflow notes).
2. Fill in **CONFIG**, including a one-line description of your business and audience.
3. Click **Test workflow** once to check, then Activate.

Change the time in *Every Morning*. Free resource from nextbizstudio.com
"""
nodes = [
    node(W, "Every Morning", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 200],
         {"rule": {"interval": [{"triggerAtHour": 9}]}}),
    node(W, "Test Run", "n8n-nodes-base.manualTrigger", 1, [0, 400], {}),
    code(W, "CONFIG", [240, 300], CONFIG_5),
    code(W, "Build AI Request", [480, 300], BUILD_5),
    http_json(W, "Ask AI", [720, 300]),
    code(W, "Format Message", [960, 300], FORMAT_5),
    http_json(W, "Send to Telegram", [1200, 300], auth=False),
    note(W, "Read me", [-480, 0], NOTE_5, 440, 400),
]
save(W, "Daily AI Reel Ideas → Telegram (NextBiz Studio)", nodes, {
    "Every Morning": {"main": [[{"node": "CONFIG", "type": "main", "index": 0}]]},
    "Test Run": {"main": [[{"node": "CONFIG", "type": "main", "index": 0}]]},
    **chain("CONFIG", "Build AI Request", "Ask AI", "Format Message", "Send to Telegram")})
