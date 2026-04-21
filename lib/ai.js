export function classifyMessage(text) {
  const lower = text.toLowerCase();

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
    lower.includes("negotiation")
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
    lower.includes("can someone")
  ) {
    return "request_change";
  }

  // Learning
  if (
    lower.startsWith("what is") ||
    lower.startsWith("what does") ||
    lower.startsWith("why does") ||
    lower.includes("usually do") ||
    lower.includes("best practice")
  ) {
    return "simple_question";
  }

  // Default to seller task
  return "seller_task";
}

function isFollowUpMessage(text) {
  const lower = text.toLowerCase().trim();

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
  const lower = text.toLowerCase();
  const category = classifyMessage(text);

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
      shouldEscalate: false,
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
        nextStep: "Send those details and I’ll narrow it down.",
      }),
    };
  }

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
        nextStep: "Create the opp in Stage 1 and complete the required setup before moving stages.",
      }),
    };
  }

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

  if (
    lower.includes("change account ownership") ||
    lower.includes("change owner") ||
    lower.includes("account ownership")
  ) {
    return {
      category: "request_change",
      shouldEscalate: false,
      answer: formatSlackReply({
        emoji: "🧭",
        title: "This is a BizOps-controlled change",
        sections: [
          {
            title: "What to do",
            lines: [
              "Submit the Account Request in Salesforce",
              "Use the ownership transfer request path",
              "Include the account link and reason for the change",
              "If the request is urgent or the path is unclear, post in #bizops_help with the account link",
            ],
          },
        ],
        nextStep: "Submit the request first, then follow up in #bizops_help only if needed.",
      }),
    };
  }

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
        nextStep: "Review the forecast view you’re using and confirm whether it shows weighted or raw pipeline.",
      }),
    };
  }

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