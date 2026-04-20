import { App } from "@slack/bolt";

// Create app (NO receiver config here)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ===== HANDLERS =====

app.message(async ({ message, client }) => {
  if (message.subtype === "bot_message" || message.bot_id) return;

  if (message.channel_type === "im") {
    await client.chat.postMessage({
      channel: message.channel,
      text: "I can help with this privately. What are you trying to do?",
    });
    return;
  }

  if (message.channel === process.env.TARGET_CHANNEL_ID && !message.thread_ts) {
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: "How do you want help?",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: "*How do you want help?*" },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Open BizOps Hub" },
              url: process.env.BIZOPS_HUB_URL,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Ask BizOps AI" },
              url: process.env.BIZOPS_GPT_URL,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Chat with BizOps Bot" },
              value: "start_private_chat",
              action_id: "start_private_chat",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Need BizOps Help" },
              value: "bizops_help",
              action_id: "bizops_help",
            },
          ],
        },
      ],
    });
  }
});

// ===== ACTIONS =====

app.action("start_private_chat", async ({ ack, body, client }) => {
  await ack();

  const dm = await client.conversations.open({
    users: body.user.id,
  });

  await client.chat.postMessage({
    channel: dm.channel.id,
    text: "I can help with this privately. What are you trying to do?",
  });

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.thread_ts || body.message.ts,
    text: "I’ve opened a private chat with you — check your DMs 👋",
  });
});

app.action("bizops_help", async ({ ack, body, client }) => {
  await ack();

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.thread_ts || body.message.ts,
    text: `Post in #bizops_help with:
- record link
- what you're trying to do
- exact error (if any)
- what you've already tried`,
  });
});

// ===== VERCEL HANDLER =====

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).send("Slack bot is running");
    }

    await app.processEvent(req.body, req.headers);

    return res.status(200).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
}