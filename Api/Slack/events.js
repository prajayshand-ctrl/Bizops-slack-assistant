import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const TARGET_CHANNEL = process.env.TARGET_CHANNEL_ID;

// ===== MESSAGE HANDLER =====
app.message(async ({ message, client }) => {
  try {
    if (message.subtype === "bot_message" || message.bot_id) return;

    // DM behavior
    if (message.channel_type === "im") {
      await client.chat.postMessage({
        channel: message.channel,
        text: "I can help with this privately. What are you trying to do?",
      });
      return;
    }

    // Channel behavior (thread reply)
    if (message.channel === TARGET_CHANNEL && !message.thread_ts) {
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.ts,
        text: "How do you want help?",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*How do you want help?*",
            },
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
            ],
          },
        ],
      });
    }
  } catch (err) {
    console.error(err);
  }
});

// ===== BUTTON HANDLER =====
app.action("start_private_chat", async ({ ack, body, client }) => {
  await ack();

  const userId = body.user.id;

  const dm = await client.conversations.open({
    users: userId,
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

// ===== EXPORT HANDLER FOR VERCEL =====
export default async function handler(req, res) {
  await app.receiver.requestHandler(req, res);
}
