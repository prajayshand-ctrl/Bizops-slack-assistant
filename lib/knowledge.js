const KNOWLEDGE_BASE = [
  {
    id: "opp-create",
    topic: "create opportunity",
    category: "seller_task",
    keywords: [
      "create opportunity",
      "new opportunity",
      "open opportunity",
      "how do i create an opportunity",
    ],
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
    keywords: [
      "stage 2",
      "move opportunity stage",
      "can't move stage",
      "cannot move stage",
      "closed won",
      "negotiation",
    ],
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
    id: "product-schedules",
    topic: "product schedules",
    category: "system_error",
    keywords: [
      "product rev schedule",
      "revenue schedule",
      "schedule opportunity",
      "product schedule",
      "can't put in stage 2 until i schedule",
      "cannot put in stage 2 until i schedule",
      "must establish a product rev schedule",
    ],
    summary:
      "Product setup now depends on required fields at the product level, not manual schedule edits.",
    snippets: [
      "For every product, enter Budget, Flight Start Date, and Flight End Date.",
      "These fields are required to save a product.",
      "If dates change, update them directly on the product.",
      "Do not modify schedules manually.",
      "Flight dates are managed at the product level and roll up to the opportunity automatically.",
      "Manual schedule edits do not affect BI reporting.",
    ],
    source: "coda_product_schedule_guidance_v1",
  },
  {
    id: "split-owner-error",
    topic: "split owner issue",
    category: "system_error",
    keywords: [
      "invalid_cross_reference_key",
      "splitowner",
      "opportunity team member",
      "can't create the opportunity team member",
      "opportunity split automations",
    ],
    summary:
      "This error is usually caused by an invalid or inactive split owner.",
    snippets: [
      "Check whether the split owner is still an active user.",
      "Remove or update invalid split owners before retrying.",
      "If the split owner is inactive, BizOps may need to clean up the record.",
    ],
    source: "curated_split_owner_guidance_v1",
  },
  {
    id: "account-ownership-types",
    topic: "account ownership transfer",
    category: "request_change",
    keywords: [
      "account ownership",
      "ownership transfer",
      "change owner",
      "agency account ownership",
      "advertiser account ownership",
      "assign this",
      "update this agency",
      "allocate to me",
    ],
    summary:
      "Ownership transfer handling depends on whether the account is advertiser or agency.",
    snippets: [
      "Advertiser account ownership transfers can go through the standard request path.",
      "Agency account ownership transfers are handled by BizOps.",
      "Do not use the advertiser ownership flow for agency accounts.",
      "Include the record link and reason in the request.",
    ],
    source: "coda_account_ownership_guidance_v1",
  },
  {
    id: "referral-flow",
    topic: "referral request",
    category: "simple_question",
    keywords: [
      "referral",
      "sales credit",
      "crossmedia",
      "qualifies as a referral",
      "sales credit / referral request",
    ],
    summary:
      "Referral requests should go through the Sales Credit / Referral Request flow.",
    snippets: [
      "Use the Account Request flow.",
      "Select 'Sales Credit / Referral Request'.",
      "Include opp details and expected amount.",
      "BizOps will review and validate the referral.",
    ],
    source: "curated_referral_guidance_v1",
  },
  {
    id: "confidential-placeholder",
    topic: "confidential opportunity",
    category: "simple_question",
    keywords: [
      "confidential",
      "nda",
      "placeholder",
      "undisclosed",
      "placeholder advertiser",
    ],
    summary:
      "Confidential opportunities should use placeholder account naming until the client is disclosed.",
    snippets: [
      "Use a placeholder advertiser name.",
      "Mark the opportunity as NDA or undisclosed where relevant.",
      "Update the account once the client is disclosed.",
    ],
    source: "curated_confidential_guidance_v1",
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