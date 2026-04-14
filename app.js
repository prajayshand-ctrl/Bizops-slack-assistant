require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const TARGET_CHANNEL = process.env.TARGET_CHANNEL_ID;

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classifyMessage(text) {
  const lower = normalize(text);

  const requestTerms = [
    "change account ownership",
    "change the ownership",
    "ownership of an account",
    "transfer ownership",
    "account ownership",
    "change owner",
    "ownership transfer",
    "change the split",
    "split request",
    "update split",
    "merge account",
    "account merge",
    "delete opportunity",
    "credit request",
    "need bizops to",
  ];

  const systemErrorTerms = [
    "can't save",
    "cannot save",
    "can’t save",
    "error",
    "validation",
    "failed",
    "flow failed",
    "permission",
    "access",
    "blocked",
    "not working",
    "won't save",
    "won’t save",
    "can't move",
    "cannot move",
    "can’t move",
    "closed won",
    "splitowner",
    "invalid_cross_reference_key",
    "inactive user",
  ];

  const learningTerms = [
    "what is weighted pipeline",
    "weighted pipeline",
    "what is pipeline",
    "how do splits work",
    "what are splits",
    "what is forecast",
  ];

  const navigationTerms = [
    "where is",
    "where can i find",
    "link",
    "hub",
    "coda",
    "where do i go",
    "where do i find",
  ];

  if (includesAny(lower, requestTerms)) return "request";
  if (includesAny(lower, systemErrorTerms)) return "system_error";
  if (includesAny(lower, learningTerms)) return "learning";
  if (includesAny(lower, navigationTerms)) return "navigation";

  return "task";
}

function buildSystemErrorResponse(text) {
  const lower = normalize(text);

  if (includesAny(lower, ["closed won", "can't move", "can’t move", "cannot move"])) {
    return `Error
- What: You’re blocked from moving the opportunity stage
- Why: This is likely a validation, automation, or ownership-related issue

What this means
- You likely can’t fix this directly

What to do
- Post in #bizops_help with:
  - opportunity link
  - current stage
  - target stage
  - exact error message`;
  }

  if (includesAny(lower, ["can't save", "can’t save", "cannot save", "validation", "flow failed", "invalid_cross_reference_key"])) {
    return `Error
- What: Salesforce is blocking the save
- Why: A validation rule, automation, or record setup issue is likely preventing it

What this means
- Seller cannot fix this directly

What to do
- Post in #bizops_help with:
  - record link
  - exact error message
  - what you were trying to update`;
  }

  if (includesAny(lower, ["permission", "access", "inactive user"])) {
    return `Error
- What: This looks like an access or user-status issue
- Why: Permissions or user setup likely need BizOps/admin review

What this means
- Seller cannot fix this directly

What to do
- Post in #bizops_help with:
  - record or dashboard link
  - screenshot
  - what access you expected`;
  }

  return `Error
- What: This looks like a system or admin-controlled issue
- Why: The blocker likely requires BizOps review

What this means
- Seller cannot fix this directly

What to do
- Post in #bizops_help with:
  - record link
  - screenshot
  - exact error
  - what you already tried`;
}

function buildRequestResponse(text) {
  const lower = normalize(text);

  if (includesAny(lower, ["ownership", "change owner", "transfer ownership"])) {
    return `What this is
- BizOps-controlled account ownership change

What to do
- Submit an Account Request in Salesforce
- Select Ownership Transfer
- Fill required details

Important
- Account Requests apply to advertiser accounts only

If urgent
- Post in #bizops_help with the account link

If already submitted
- Do not resubmit
- Follow up in #bizops_help`;
  }

  if (includesAny(lower, ["split", "change the split", "split request", "update split"])) {
    return `What this is
- BizOps-controlled split change

What to do
- Submit the correct split request in Salesforce
- Include the account or opportunity link and requested split details

If urgent or blocked
- Post in #bizops_help with:
  - record link
  - current split
  - requested split`;
  }

  if (includesAny(lower, ["merge", "account merge"])) {
    return `What this is
- BizOps-controlled account merge

What to do
- Submit an Account Request in Salesforce
- Use the merge-related request type if available

If unsure
- Post in #bizops_help with both account links and note which should remain`;
  }

  return `What this is
- BizOps-controlled change

What to do
- Submit the correct request in Salesforce
- Choose the request type that matches the change

If urgent or unclear
- Post in #bizops_help with the record link and requested change`;
}

function buildLearningResponse(text) {
  const lower = normalize(text);

  if (includesAny(lower, ["weighted pipeline"])) {
    return `- Weighted pipeline is pipeline adjusted by deal probability
- It gives a more realistic revenue view than raw pipeline
- It is used to understand likely value, not just total open dollars`;
  }

  if (includesAny(lower, ["splits", "how do splits work"])) {
    return `- Splits show how ownership is shared across sellers
- Ownership and splits should be reviewed in the 2026 Account Ownership Dashboard
- Search for the account or your name and review the ownership and split fields`;
  }

  if (includesAny(lower, ["forecast"])) {
    return `- Forecast reflects expected revenue based on deal details
- It depends on accurate stage, amount, and close date
- Keep those fields updated so reporting is realistic`;
  }

  return `- This is a simple BizOps concept question
- I can answer it briefly
- Send the exact term or metric you want defined`;
}

function buildNavigationResponse(text) {
  const lower = normalize(text);

  if (includesAny(lower, ["hub", "coda"])) {
    return `Go here
- BizOps Hub: ${process.env.BIZOPS_HUB_URL}`;
  }

  if (includesAny(lower, ["gpt", "ai"])) {
    return `Go here
- BizOps AI: ${process.env.BIZOPS_GPT_URL}`;
  }

  if (includesAny(lower, ["ownership"])) {
    return `Go here
- 2026 Account Ownership Dashboard

What to do
- Search for the account or your name
- Review ownership and split fields`;
  }

  return `Fastest places to start
- BizOps Hub: ${process.env.BIZOPS_HUB_URL}
- BizOps AI: ${process.env.BIZOPS_GPT_URL}`;
}

function buildTaskResponse(text) {
  const lower = normalize(text);

  if (includesAny(lower, ["create an opportunity", "create opportunity", "create opp", "create an opp"])) {
    return `Do this
1. Open the account record
2. Click New Opportunity
3. Choose the correct record type
4. Complete the required fields
5. Save and add products if needed`;
  }

  if (includesAny(lower, ["update forecast", "forecast"])) {
    return `Do this
1. Open the opportunity
2. Review stage, amount, and close date
3. Update the relevant forecast fields
4. Save the record
5. Confirm it reflects correctly in reporting`;
  }

  if (includesAny(lower, ["who owns this account", "account owner"])) {
    return `Check this first
- Use the 2026 Account Ownership Dashboard

What to do
- Search for the account or your name
- Review the ownership and split fields`;
  }

  if (includesAny(lower, ["move stage", "opportunity stage"])) {
    return `Do this first
1. Open the opportunity
2. Review required fields, close date, and amount
3. Try the stage update again
4. If Salesforce returns an error, post in #bizops_help with the opportunity link and exact error`;
  }

  return `Do this first
1. Start with the record or workflow involved
2. Review the required fields or process
3. Make the update if it is seller-editable
4. If blocked, post in #bizops_help with the link and issue`;
}

function buildResponse(text) {
  const type = classifyMessage(text);

  if (type === "system_error") return buildSystemErrorResponse(text);
  if (type === "request") return buildRequestResponse(text);
  if (type === "learning") return buildLearningResponse(text);
  if (type === "navigation") return buildNavigationResponse(text);
  return buildTaskResponse(text);
}

app.message(async ({ message, client }) => {
  try {
    if (message.subtype === "bot_message" || message.bot_id) return;

    // Private bot chat: normal DM response
    if (message.channel_type === "im") {
      const reply = buildResponse(message.text || "");

      await client.chat.postMessage({
        channel: message.channel,
        text: reply,
      });

      return;
    }

    // Main test channel: reply in thread only for top-level messages
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
                action_id: "open_hub",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Ask BizOps AI" },
                url: process.env.BIZOPS_GPT_URL,
                action_id: "open_gpt",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Chat with BizOps Bot" },
                value: "start_private_chat",
                action_id: "start_private_chat",
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "For fastest help, start with AI or Bot.",
              },
            ],
          },
        ],
      });

      return;
    }
  } catch (error) {
    console.error("Message handler error:", error);

    if (message.channel_type === "im") {
      await client.chat.postMessage({
        channel: message.channel,
        text: "Something went wrong on my side. Please try again.",
      });
    }
  }
});

app.action("start_private_chat", async ({ ack, body, client }) => {
  await ack();

  try {
    const userId = body.user.id;

    const dm = await client.conversations.open({
      users: userId,
    });

    const dmChannelId = dm.channel.id;

    // Send DM message
    await client.chat.postMessage({
      channel: dmChannelId,
      text: "I can help with this privately. What are you trying to do?",
    });

    // Post a helpful thread reply in the original channel thread
    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: body.message.thread_ts || body.message.ts,
      text: "I’ve opened a private chat with you — check your Alerts 👋",
    });
  } catch (err) {
    console.error("DM open error:", err);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ BizOps Slack bot is running!");
})();