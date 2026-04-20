import { createSlackApp } from "../../lib/slackApp.js";

const app = createSlackApp();

const TARGET_CHANNEL = process.env.TARGET_CHANNEL_ID;

// ===== MESSAGE HANDLER =====
app.message(async ({ message, client }) => {
  if (message.subtype === "bot_message" || message.bot_id) return;

  // DM behavior
  if (message.channel_type === "im") {
    await client.chat.postMessage({
      channel: message.channel,
      text: "I can help with this privately. What are you trying to do?",
    });
    return;
  }

  // Channel behavior (thread)
  if (message.channel === TARGET_CHANNEL && !message.thread_ts) {
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

// ===== BUTTON HANDLER =====
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

// ===== NEW: BIZOPS HELP BUTTON =====
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

// ===== HANDLER =====
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("Slack bot is running");
  }

  return app.receiver.requestHandler(req, res);
}