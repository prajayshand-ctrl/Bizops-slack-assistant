const KNOWLEDGE_BASE = [
  {
    id: "opp-create",
    topic: "create opportunity",
    category: "seller_task",
    keywords: ["create opportunity", "new opportunity", "open opportunity"],
    summary:
      "Create the opportunity from the correct Account, start in Stage 1, and complete the required setup before advancing.",
    snippets: [
      "Open the correct Account in Salesforce.",
      "Click New Opportunity and select the correct record type.",
      "Start in Stage 1.",
      "Complete required fields before moving stages.",
    ],
    source: "curated_v1",
  },
  {
    id: "stage-2-contact-role",
    topic: "move to stage 2",
    category: "system_error",
    keywords: ["stage 2", "move opportunity stage", "can't move stage", "cannot move stage"],
    summary:
      "Stage movement issues are often caused by missing required setup, especially Contact Role or stage requirements.",
    snippets: [
      "Opportunities must start in Stage 1.",
      "Stage 2 requires a Contact Role.",
      "Negotiation requires Flight Start, Flight End, Close Date, and Revenue Schedules.",
    ],
    source: "curated_v1",
  },
  {
    id: "account-ownership",
    topic: "account ownership",
    category: "request_change",
    keywords: ["account ownership", "change owner", "ownership transfer"],
    summary:
      "Account ownership changes are BizOps-controlled and should follow the correct request process.",
    snippets: [
      "Do not change the owner directly.",
      "Use the account request / ownership transfer process.",
      "If the path is unclear or urgent, escalate in #bizops_help with the account link.",
    ],
    source: "curated_v1",
  },
  {
    id: "weighted-pipeline",
    topic: "weighted pipeline",
    category: "simple_question",
    keywords: ["weighted pipeline", "pipeline weighting"],
    summary:
      "Weighted pipeline is expected revenue adjusted by deal probability.",
    snippets: [
      "It reflects likely revenue, not just total open pipeline.",
      "It is based on opportunity stage probability.",
    ],
    source: "curated_v1",
  },
];

function normalize(text = "") {
  return text.toLowerCase().trim();
}

function scoreMatch(query, item) {
  const normalizedQuery = normalize(query);
  let keywordScore = 0;

  for (const keyword of item.keywords) {
    if (normalizedQuery.includes(normalize(keyword))) {
      keywordScore += 3;
    }
  }

  if (normalizedQuery.includes(normalize(item.topic))) {
    keywordScore += 2;
  }

  return keywordScore;
}

export function getKnowledgeContext(query, category = null) {
  const ranked = KNOWLEDGE_BASE.map((item) => {
    const baseScore = scoreMatch(query, item);
    const categoryBonus =
      baseScore > 0 && category && item.category === category ? 1 : 0;

    return {
      ...item,
      score: baseScore + categoryBonus,
      baseScore,
    };
  })
    .filter((item) => item.baseScore > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      found: false,
      source: "none",
      summary: null,
      snippets: [],
      match: null,
    };
  }

  const best = ranked[0];

  return {
    found: true,
    source: best.source,
    summary: best.summary,
    snippets: best.snippets,
    match: {
      id: best.id,
      topic: best.topic,
      category: best.category,
    },
  };
}