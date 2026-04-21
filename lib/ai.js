function normalize(text = "") {
  return text.toLowerCase().trim();
}

function matchesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractSalesforceLink(text) {
  const match = text.match(/https:\/\/[^\s]*salesforce\.com[^\s]*/i);
  return match ? match[0] : null;
}

function isFollowUpMessage(text) {
  return matchesAny(normalize(text), [
    "still isn't working",
    "still isnt working",
    "still not working",
    "that didn't work",
    "that didnt work",
    "didn't work",
    "didnt work",
    "not working",
    "still blocked",
    "same issue",
    "it still isn’t working",
    "it still isn't working",
    "it still didnt work",
    "it still didn’t work",
  ]);
}

function mentionsAttachmentOrLink(text) {
  return matchesAny(normalize(text), [
    "screenshot",
    "see screenshot",
    "attached",
    "see image",
    "image",
    "link",
    "salesforce.com",
    "http://",
    "https://",
  ]);
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

  if (intro) parts.push(intro);

  for (const section of sections) {
    if (!section?.title || !section?.lines?.length) continue;
    parts.push(formatSection(section.title, section.lines));
  }

  if (nextStep) {
    parts.push(`📌 *Next step:*\n${nextStep}`);
  }

  return parts.join("\n\n");
}

const INTENT_KEYWORDS = {
  followUp: [
    "still isn't working",
    "still isnt working",
    "still not working",
    "that didn't work",
    "that didnt work",
    "didn't work",
    "didnt work",
    "not working",
    "still blocked",
    "same issue",
  ],

  splitOwnerError: [
    "invalid_cross_reference_key",
    "splitowner",
    "opportunity team member",
    "can't create the opportunity team member",
    "opportunity split automations",
  ],

  productSetupIssue: [
    "product rev schedule",
    "revenue schedule",
    "schedule opportunity",
    "product schedule",
    "must establish a product rev schedule",
    "can't put in stage 2 until i schedule",
    "cannot put in stage 2 until i schedule",
    "trying to schedule an opportunity",
    "can't progress the stage",
  ],

  confidentialOpp: [
    "confidential",
    "nda",
    "placeholder",
    "undisclosed",
    "advertiser is unknown",
    "advertiser still unknown",
    "client is unknown",
    "client still unknown",
    "client not confirmed",
    "advertiser not confirmed",
    "advertiser not finalized",
    "client not finalized",
    "advertiser is still unknown",
    "how should i create the opp",
    "unknown advertiser",
  ],

  referralFlow: [
    "referral",
    "sales credit",
    "crossmedia",
    "qualifies as a referral",
    "sales credit / referral request",
  ],

  agencyOwnership: [
    "agency account ownership",
    "agency ownership transfer",
    "change agency owner",
    "transfer agency account",
    "update this agency",
    "assign this agency",
    "can you update this agency",
  ],

  ownershipRequest: [
    "change account ownership",
    "change owner",
    "account ownership",
    "ownership transfer",
    "assign this",
    "allocate to me",
    "can you update this",
    "assign this account",
    "update this account",
  ],

  createOpp: [
    "how do i create an opportunity",
    "create opportunity",
    "new opportunity",
    "open opportunity",
  ],

  stageValidation: [
    "can't move",
    "cannot move",
    "stage 2",
    "closed won",
    "closed lost",
    "negotiation",
    "move stage",
    "opportunity stage",
  ],

  weightedPipeline: [
    "weighted pipeline",
    "pipeline weighting",
  ],

  genericSystemError: [
    "can't save",
    "cannot save",
    "validation",
    "error",
    "failed",
    "locked",
    "blocked",
  ],

  genericRequestChange: [
    "merge account",
    "delete opp",
    "delete opportunity",
    "split request",
    "can someone",
    "ownership transfer",
    "change owner",
  ],

  genericLearning: [
    "what is",
    "what does",
    "why does",
    "usually do",
    "best practice",
  ],
};

function detectIntent(lower) {
  const intentRules = [
    { intent: "splitOwnerError", test: () => matchesAny(lower, INTENT_KEYWORDS.splitOwnerError) },
    { intent: "productSetupIssue", test: () => matchesAny(lower, INTENT_KEYWORDS.productSetupIssue) },
    { intent: "agencyOwnership", test: () => matchesAny(lower, INTENT_KEYWORDS.agencyOwnership) },
    { intent: "ownershipRequest", test: () => matchesAny(lower, INTENT_KEYWORDS.ownershipRequest) },
    { intent: "referralFlow", test: () => matchesAny(lower, INTENT_KEYWORDS.referralFlow) },
    { intent: "confidentialOpp", test: () => matchesAny(lower, INTENT_KEYWORDS.confidentialOpp) },
    { intent: "createOpp", test: () => matchesAny(lower, INTENT_KEYWORDS.createOpp) },
    {
      intent: "stageValidation",
      test: () =>
        (lower.includes("can't move") || lower.includes("cannot move") || lower.includes("move stage")) &&
        matchesAny(lower, ["stage 2", "closed won", "negotiation", "opportunity stage"]),
    },
    { intent: "weightedPipeline", test: () => matchesAny(lower, INTENT_KEYWORDS.weightedPipeline) },
  ];

  const match = intentRules.find((rule) => rule.test());
  return match ? match.intent : null;
}

export function classifyMessage(text) {
  const lower = normalize(text);
  const intent = detectIntent(lower);

  if (["splitOwnerError", "productSetupIssue", "stageValidation"].includes(intent)) {
    return "system_error";
  }

  if (["agencyOwnership", "ownershipRequest"].includes(intent)) {
    return "request_change";
  }

  if (["referralFlow", "confidentialOpp", "weightedPipeline"].includes(intent)) {
    return "simple_question";
  }

  if (intent === "createOpp") {
    return "seller_task";
  }

  if (matchesAny(lower, INTENT_KEYWORDS.genericSystemError)) {
    return "system_error";
  }

  if (matchesAny(lower, INTENT_KEYWORDS.genericRequestChange)) {
    return "request_change";
  }

  if (
    lower.startsWith("what is") ||
    lower.startsWith("what does") ||
    lower.startsWith("why does") ||
    matchesAny(lower, INTENT_KEYWORDS.genericLearning)
  ) {
    return "simple_question";
  }

  return "seller_task";
}

export function getMockBizOpsReply(text, priorState = {}) {
  const lower = normalize(text);
  const category = classifyMessage(text);
  const intent = detectIntent(lower);
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
                "What report, dashboard, or workflow you’re looking at",
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

  if (intent === "splitOwnerError") {
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

  if (intent === "productSetupIssue") {
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

  if (intent === "agencyOwnership") {
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

  if (intent === "ownershipRequest") {
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

  if (intent === "referralFlow") {
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

  if (intent === "confidentialOpp") {
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

  if (intent === "createOpp") {
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

  if (intent === "stageValidation") {
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

  if (intent === "weightedPipeline") {
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