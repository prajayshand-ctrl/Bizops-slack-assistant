import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { getBizOpsReply } from "./ai.js";
import { getKnowledgeContext } from "./knowledge.js";
import { buildEscalationMessage } from "./escalation.js";
import {
  appendTurn,
  getConversationState,
  updateConversationState,
} from "./conversationState.js";
import { logInfo, logError } from "./logger.js";

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
      logInfo("dm_received", {
        user: message.user,
        channel: message.channel,
        text: userText,
      });

      appendTurn(message.channel, "user", userText);

      const priorState = getConversationState(message.channel);
      const knowledge = getKnowledgeContext(userText, priorState.lastCategory);

      if (knowledge.found) {
        logInfo("knowledge_hit", {
          user: message.user,
          channel: message.channel,
          source: knowledge.source,
          topic: knowledge.match?.topic,
          category: knowledge.match?.category,
        });
      } else {
        logInfo("knowledge_miss", {
          user: message.user,
          channel: message.channel,
        });
      }

      const result = await getBizOpsReply(userText, priorState, knowledge);

      logInfo("dm_result", {
        user: message.user,
        channel: message.channel,
        category: result.category,
        shouldEscalate: result.shouldEscalate,
        needsClarification: result.needsClarification,
      });

      logInfo("dm_classification", {
        user: message.user,
        channel: message.channel,
        category: result.category,
        shouldEscalate: result.shouldEscalate,
      });

      let finalAnswer = result.answer;

      if (knowledge.found) {
  const snippetText = knowledge.snippets.map((item) => `• ${item}`).join("\n");

  finalAnswer = `${finalAnswer}

🧠 *Relevant context:*
${snippetText}`;
}

      if (result.shouldEscalate) {
  const escalationMessage = buildEscalationMessage({
    originalText: userText,
    category: result.category,
    extraDetails: knowledge.found
      ? [`Likely topic: ${knowledge.match?.topic || "unknown"}`]
      : [],
  });

  finalAnswer = `${finalAnswer}

${escalationMessage}`;
}

      await client.chat.postMessage({
        channel: message.channel,
        text: finalAnswer,
      });

      appendTurn(message.channel, "assistant", finalAnswer);

      updateConversationState(message.channel, {
        lastCategory: result.category,
        lastIssue: userText,
        lastSuggestedAction: result.shouldEscalate
          ? "Escalate to BizOps with structured details"
          : "Follow the guidance provided",
        lastEscalationNeeded: result.shouldEscalate,
      });
    } catch (error) {
      logError("dm_reply_failed", error, {
        user: message.user,
        channel: message.channel,
      });

      await client.chat.postMessage({
        channel: message.channel,
        text: "I hit an issue generating a reply. Please try again or escalate in #bizops_help.",
      });
    }

    return;
  }

  if (message.channel === process.env.TARGET_CHANNEL_ID && !message.thread_ts) {
    logInfo("channel_intake_received", {
      user: message.user,
      channel: message.channel,
      ts: message.ts,
    });

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

  try {
    logInfo("action_start_private_chat", {
      user: body.user.id,
      channel: body.channel.id,
    });

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
  } catch (error) {
    logError("action_start_private_chat_failed", error, {
      user: body.user?.id,
      channel: body.channel?.id,
    });
  }
});

app.action("bizops_help", async ({ ack, body, client }) => {
  await ack();

  try {
    logInfo("action_bizops_help", {
      user: body.user.id,
      channel: body.channel.id,
    });

    const escalationMessage = buildEscalationMessage();

    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: body.message.thread_ts || body.message.ts,
      text: escalationMessage,
    });
  } catch (error) {
    logError("action_bizops_help_failed", error, {
      user: body.user?.id,
      channel: body.channel?.id,
    });
  }
});

export { app, receiver };