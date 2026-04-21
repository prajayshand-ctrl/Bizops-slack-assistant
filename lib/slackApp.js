import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { getMockBizOpsReply } from "./ai.js";

const receiver = new VercelReceiver();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
  deferInitialization: true,
});

app.message(async ({ message, client }) => {
  if (message.subtype === "bot_message" || message.bot_id) return;

  if (message.channel_type === "im") {
    const userText = message.text?.trim();

    if (!userText) {
      await client.chat.postMessage({
        channel: message.channel,
        text: "Send me your question and I’ll help you with the next step.",
      });
      return;
    }

    try {
      const result = getMockBizOpsReply(userText);

      console.log("dm_classification", {
        category: result.category,
        shouldEscalate: result.shouldEscalate,
        user: message.user,
        channel: message.channel,
      });

      await client.chat.postMessage({
        channel: message.channel,
        text: result.answer,
      });
    } catch (error) {
      console.error("DM mock reply failed:", error);

      await client.chat.postMessage({
        channel: message.channel,
        text: "I hit an issue generating a reply. Please try again or escalate in #bizops_help.",
      });
    }

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
    text: `Reply in this thread with:
- record link
- what you're trying to do
- exact error
- what you've already tried
- urgency / deadline

When you’ve added the details, tag @BizOps in this thread so the team gets a notification.`,
  });
});

export { app, receiver };