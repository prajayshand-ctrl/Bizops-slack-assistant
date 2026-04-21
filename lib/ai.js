function normalize(text = "") {
  return text.toLowerCase().trim();
}

export function classifyMessage(text) {
  const lower = normalize(text);

  // System / admin / blocker
  if (
    lower.includes("can't move") ||
    lower.includes("cannot move") ||
    lower.includes("can't save") ||
    lower.includes("cannot save") ||
    lower.includes("validation") ||
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("locked") ||
    lower.includes("blocked") ||
    lower.includes("closed won") ||
    lower.includes("closed lost") ||
    lower.includes("stage 2") ||
    lower.includes("negotiation") ||
    lower.includes("invalid_cross_reference_key") ||
    lower.includes("splitowner") ||
    lower.includes("opportunity team member") ||
    lower.includes("revenue schedule") ||
    lower.includes("product rev schedule")
  ) {
    return "system_error";
  }

  // Request / change
  if (
    lower.includes("change account ownership") ||
    lower.includes("change owner") ||
    lower.includes("ownership transfer") ||
    lower.includes("merge account") ||
    lower.includes("delete opp") ||
    lower.includes("delete opportunity") ||
    lower.includes("split request") ||
    lower.includes("assign this") ||
    lower.includes("update this agency") ||
    lower.includes("allocate to me") ||
    lower.includes("can you update this") ||
    lower.includes("can someone")
  ) {
    return "request_change";
  }

  // Learning / process / best practice
  if (
    lower.startsWith("what is") ||
    lower.startsWith("what does") ||
    lower.startsWith("why does") ||
    lower.includes("usually do") ||
    lower.includes("best practice") ||
    lower.includes("referral") ||
    lower.includes("confidential") ||
    lower.includes("nda") ||
    lower.includes("placeholder")
  ) {
    return "simple_question";
  }

  // Default to seller task
  return "seller_task";
}

function isFollowUpMessage(text) {
  const lower = normalize(text);

  return (
    lower.includes("still isn't working") ||
    lower.includes("still isnt working") ||
    lower.includes("still not working") ||
    lower.includes("that didn't work") ||
    lower.includes("that didnt work") ||
    lower.includes("didn't work") ||
    lower.includes("didnt work") ||
    lower.includes("not working") ||
    lower.includes("still blocked") ||
    lower.includes("same issue") ||
    lower === "it still isn’t working" ||
    lower === "it still isn't working" ||
    lower === "it still didnt work" ||
    lower === "it still didn’t work"
  );
}

function mentionsAttachmentOrLink(text) {
  const lower = normalize(text);
  return (
    lower.includes("screenshot") ||
    lower.includes("see screenshot") ||
    lower.includes("attached") ||
    lower.includes("see image") ||
    lower.includes("image") ||
    lower.includes("link") ||
    lower.includes("salesforce.com") ||
    lower.includes("http://") ||
    lower.includes("https://")
  );
}

function extractSalesforceLink(text) {
  const match = text.match(/https:\/\/[^\s]*salesforce\.com[^\s]*/i);
  return match ? match[0] : null;
}

function formatSection(title, lines = []) {
  if (!lines.length) return "";
  return `*${title}*\n${lines.map((line) => `• ${line}`).join("\n")}`;
}

function formatSlackReply({
  emoji = "💬",
  title,
  intro = null,
  sections = [],
  nextStep = null,
}) {
  const parts = [];

  parts.push(`${emoji} *${title}*`);

  if (intro) {
    parts.push(intro);
  }

  for (const section of sections) {
    if (!section?.title || !section?.lines?.length) continue;
    parts.push(formatSection(section.title, section.lines));
  }

  if (nextStep) {
    parts.push(`📌 *Next step:*\n${nextStep}`);
  }

  return parts.join("\n\n");
}

export function getMockBizOpsReply(text, priorState = {}) {
  const lower = normalize(text);
  const category = classifyMessage(text);
  const hasAttachmentOrLink = mentionsAttachmentOrLink(text);
  const salesforceLink = extractSalesforceLink(text);

  if (isFollowUpMessage(text)) {
    if (priorState.lastCategory === "system_error") {
      return {
        category: "system_error",
        shouldEscalate: true,
        answer: formatSlackReply({
          emoji: "⚠️",
          title: "Still blocked",
          intro: `This still looks related to: ${priorState.lastIssue || "your previous issue"}.`,
          sections: [
            {
              title: "Quick checks",
              lines: [
                "Confirm which step failed this time",
                "Confirm whether the error message changed",
                "Confirm whether any fields or setup were updated",
              ],
            },
          ],
          nextStep:
            "If it is still blocked after those checks, reply in the #bizops_help thread with the record link, exact error, what you already tried, and urgency — then tag @BizOps.",
        }),
      };
    }

    if (priorState.lastCategory === "simple_question") {
      return {
        category: "simple_question",
        shouldEscalate: false,
        answer: formatSlackReply({
          emoji: "🔍",
          title: "Let’s narrow it down",
          intro: `This still seems related to: ${priorState.lastIssue || "your previous question"}.`,
          sections: [
            {
              title: "Helpful details",
              lines: [
                "What report, dashboard, or view you’re looking at",
                "What number or behavior looks off",
                "What you expected to see instead",
              ],
            },
          ],
          nextStep: "Send the specific mismatch and I’ll help narrow it down.",
        }),
      };
    }

    if (priorState.lastCategory === "request_change") {
      return {
        category: "request_change",
        shouldEscalate: false,
        answer: formatSlackReply({
          emoji: "🧭",
          title: "Let’s confirm the request path",
          intro: `This still seems related to: ${priorState.lastIssue || "your earlier request"}.`,
          sections: [
            {
              title: "Check these",
              lines: [
                "You’re using the correct Salesforce request type",
                "The record link is included",
                "The request reason is clear",
              ],
            },
          ],
          nextStep:
            "If the request path is unclear or blocked, post in #bizops_help with the record link and reason.",
        }),
      };
    }

    return {
      category: priorState.lastCategory || "seller_task",
      shouldEscalate: priorState.lastCategory === "system_error",
      answer: formatSlackReply({
        emoji: "🔁",
        title: "Let’s troubleshoot the next step",
        intro: `This still seems related to: ${priorState.lastIssue || "your previous issue"}.`,
        sections: [
          {
            title: "Helpful details",
            lines: [
              "The exact step you took",
              "The record link, if relevant",
              "The exact error, if there is one",
            ],
          },
        ],
        nextStep:
          priorState.lastCategory === "system_error"
            ? "If it is still blocked after that, escalate in #bizops_help with the record link, exact error, and what you already tried."
            : "Send those details and I’ll narrow it down.",
      }),
    };
  }

  // Split owner / invalid cross reference
  if (
    lower.includes("invalid_cross_reference_key") ||
    lower.includes("splitowner") ||
    lower.includes("opportunity team member")
  ) {
    return {
      category: "system_error",
      shouldEscalate: true,
      answer: formatSlackReply({
        emoji: "⚠️",
        title: "Split owner issue",
        intro: salesforceLink
          ? `This looks tied to the record you shared: ${salesforceLink}`
          : "This error usually means the split owner is invalid or inactive.",
        sections: [
          {
            title: "Check this",
            lines: [
              "Confirm the split owner is an active user",
              "Remove or update invalid split owners",
              "Retry saving after fixing the split",
            ],
          },
        ],
        nextStep:
          "If the split owner is inactive or the issue persists, escalate to BizOps with the opp link and exact error.",
      }),
    };
  }

  // Product schedule / product setup issue
  if (
    lower.includes("product rev schedule") ||
    lower.includes("revenue schedule") ||
    lower.includes("schedule opportunity") ||
    lower.includes("can't put in stage 2 until i schedule") ||
    lower.includes("cannot put in stage 2 until i schedule")
  ) {
    const intro = hasAttachmentOrLink
      ? "I’m using the details you shared here, including the screenshot/link context in your message. The blocker is likely that one or more products are missing required product fields."
      : "The blocker is likely that one or more products are missing required product fields.";

    return {
      category: "system_error",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "⚠️",
        title: "This looks like a product setup issue",
        intro,
        sections: [
          {
            title: "Check these on each product",
            lines: [
              "Budget",
              "Flight Start Date",
              "Flight End Date",
            ],
          },
          {
            title: "Important",
            lines: [
              "Update dates directly on the product",
              "Do not modify schedules manually",
              "Product dates roll up to the opportunity automatically",
            ],
          },
        ],
        nextStep:
          "Open each product, fill in Budget + Flight Start Date + Flight End Date, then try the stage change again. If it still blocks after that, escalate in #bizops_help.",
      }),
    };
  }

  // Agency ownership transfer
  if (
    lower.includes("agency account ownership") ||
    lower.includes("agency ownership transfer") ||
    lower.includes("change agency owner") ||
    lower.includes("transfer agency account")
  ) {
    return {
      category: "request_change",
      shouldEscalate: true,
      answer: formatSlackReply({
        emoji: "🧭",
        title: "Agency ownership changes are BizOps-managed",
        intro:
          "Agency account ownership transfers should not use the standard advertiser ownership request flow.",
        sections: [
          {
            title: "What to include",
            lines: [
              "Account link",
              "Current owner",
              "Requested new owner",
              "Reason for the change",
            ],
          },
        ],
        nextStep:
          "Post in #bizops_help with the account link and transfer details, then tag @BizOps if it is urgent.",
      }),
    };
  }

  // General ownership / assignment request
  if (
    lower.includes("assign this") ||
    lower.includes("update this agency") ||
    lower.includes("can you update this") ||
    lower.includes("allocate to me") ||
    lower.includes("change account ownership") ||
    lower.includes("change owner") ||
    lower.includes("account ownership") ||
    lower.includes("ownership transfer")
  ) {
    return {
      category: "request_change",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "🧭",
        title: "This depends on the account type",
        sections: [
          {
            title: "If this is an advertiser account",
            lines: [
              "Submit the Account Request in Salesforce",
              "Use the ownership transfer request path",
              "Include the account link and reason for the change",
            ],
          },
          {
            title: "If this is an agency account",
            lines: [
              "Do not use the standard advertiser ownership transfer flow",
              "Route it to BizOps instead",
            ],
          },
        ],
        nextStep:
          "Confirm whether the account is advertiser or agency first. If it is agency, post in #bizops_help with the account link and reason.",
      }),
    };
  }

  // Referral flow
  if (
    lower.includes("referral") ||
    lower.includes("crossmedia") ||
    lower.includes("qualifies as a referral")
  ) {
    return {
      category: "simple_question",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "🔁",
        title: "Referral flow",
        sections: [
          {
            title: "What to do",
            lines: [
              "Use the Account Request flow",
              "Select 'Sales Credit / Referral Request'",
              "Keep ownership with the originating seller until the handoff is confirmed",
              "BizOps will review and validate the referral",
            ],
          },
        ],
        nextStep:
          "Submit the referral request and include the opp details and expected amount.",
      }),
    };
  }

  // Confidential / placeholder workflow
  if (
    lower.includes("confidential") ||
    lower.includes("nda") ||
    lower.includes("placeholder")
  ) {
    return {
      category: "simple_question",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "🕵️",
        title: "Confidential opportunities",
        sections: [
          {
            title: "Best practice",
            lines: [
              "Use a placeholder advertiser name",
              "Mark it as NDA or undisclosed",
              "Update the account once the client is disclosed",
            ],
          },
        ],
        nextStep:
          "Create the opp with a placeholder and update it once the client is confirmed.",
      }),
    };
  }

  // Create opportunity
  if (lower.includes("how do i create an opportunity")) {
    return {
      category: "seller_task",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "✅",
        title: "Create an opportunity",
        sections: [
          {
            title: "Do this",
            lines: [
              "Open the correct Account in Salesforce",
              "Click New Opportunity",
              "Select the right record type",
              "Fill in the required fields",
              "Save, then add products or schedules if needed",
            ],
          },
        ],
        nextStep:
          "Create the opp in Stage 1 and complete the required setup before moving stages.",
      }),
    };
  }

  // Stage validation issue
  if (
    lower.includes("can't move") &&
    (lower.includes("stage 2") || lower.includes("closed won") || lower.includes("negotiation"))
  ) {
    return {
      category: "system_error",
      shouldEscalate: true,
      answer: formatSlackReply({
        emoji: "⚠️",
        title: "This looks like a stage validation issue",
        sections: [
          {
            title: "Check these first",
            lines: [
              "Confirm the opp started in Stage 1",
              "Add a Contact Role if you're moving to Stage 2",
              "Confirm Flight Start, Flight End, Close Date, and Revenue Schedules are filled in if you're moving to Negotiation",
              "If Closed Won, confirm Reason, Sub-reason, and Notes are complete",
            ],
          },
        ],
        nextStep:
          "If it is still blocked, reply in the #bizops_help thread with the opp link, current stage, exact error, and what you already tried — then tag @BizOps.",
      }),
    };
  }

  // Weighted pipeline
  if (lower.includes("weighted pipeline")) {
    return {
      category: "simple_question",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "📊",
        title: "Weighted pipeline",
        intro: "Weighted pipeline is expected revenue adjusted by deal probability.",
        sections: [
          {
            title: "What that means",
            lines: [
              "It uses stage likelihood, not just raw pipeline",
              "It helps make forecast views more realistic",
              "It is useful for comparing likely revenue vs total open pipeline",
            ],
          },
        ],
        nextStep:
          "Review the forecast view you’re using and confirm whether it shows weighted or raw pipeline.",
      }),
    };
  }

  // Generic system error
  if (category === "system_error") {
    return {
      category,
      shouldEscalate: true,
      answer: formatSlackReply({
        emoji: "⚠️",
        title: "This looks like a system or admin-controlled issue",
        sections: [
          {
            title: "Check these first",
            lines: [
              "Required fields",
              "Contact roles",
              "Dates",
              "Products or revenue schedules",
            ],
          },
        ],
        nextStep:
          "If it is still blocked, post in #bizops_help with the record link, what you're trying to do, the exact error, and what you've already tried — then tag @BizOps.",
      }),
    };
  }

  // Generic request / change
  if (category === "request_change") {
    return {
      category,
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "🧭",
        title: "This sounds like a BizOps-controlled request",
        sections: [
          {
            title: "What to do",
            lines: [
              "Use the correct Salesforce request path if one exists",
              "Do not rely on Slack as the primary workflow",
              "If the request path is unclear, post in #bizops_help with the record link and reason",
            ],
          },
        ],
        nextStep: "Submit the request or escalate with the record link.",
      }),
    };
  }

  // Generic learning question
  if (category === "simple_question") {
    return {
      category,
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "💡",
        title: "Quick answer",
        sections: [
          {
            title: "What to know",
            lines: [
              "This looks like a general process or learning question",
              "Check the BizOps Hub first for the documented workflow",
              "Confirm with BizOps if the case seems unusual",
            ],
          },
        ],
        nextStep: "Review the related BizOps Hub section.",
      }),
    };
  }

  // Default seller task
  return {
    category: "seller_task",
    shouldEscalate: false,
    answer: formatSlackReply({
      emoji: "✅",
      title: "Here’s what to do",
      sections: [
        {
          title: "Steps",
          lines: [
            "Open the relevant Salesforce record",
            "Review the required fields and setup",
            "Update the missing or incorrect values",
            "Retry the action",
          ],
        },
      ],
      nextStep: "Make the update and try again.",
    }),
  };
}