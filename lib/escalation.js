function extractSalesforceLink(text = "") {
  const match = text.match(/https:\/\/[^\s]*salesforce\.com[^\s]*/i);
  return match ? match[0] : null;
}

function summarizeIssue(text = "", category = "") {
  const lower = text.toLowerCase();

  if (lower.includes("agency") && lower.includes("owner")) {
    return "Agency ownership transfer request";
  }

  if (lower.includes("referral")) {
    return "Referral / sales credit question";
  }

  if (lower.includes("product rev schedule") || lower.includes("revenue schedule")) {
    return "Product setup issue blocking stage movement";
  }

  if (lower.includes("invalid_cross_reference_key") || lower.includes("splitowner")) {
    return "Split owner / invalid user error";
  }

  if (category === "system_error") {
    return "System error blocking seller action";
  }

  if (category === "request_change") {
    return "BizOps-controlled request";
  }

  return "Needs BizOps review";
}

export function buildEscalationMessage({
  issueSummary,
  originalText = "",
  category = "",
  urgency = "[add urgency / deadline]",
  extraDetails = [],
} = {}) {
  const recordLink = extractSalesforceLink(originalText);
  const summary = issueSummary || summarizeIssue(originalText, category);

  const lines = [
    "🚨 *BizOps handoff*",
    "",
    "*Issue*",
    `• ${summary}`,
  ];

  if (recordLink) {
    lines.push("", "*Record*", `• ${recordLink}`);
  }

  lines.push(
    "",
    "*Include in your thread reply*",
    "• what you're trying to do",
    "• exact error",
    "• what you already tried",
    `• urgency / deadline: ${urgency}`
  );

  if (extraDetails.length) {
    lines.push("", "*Additional context*");
    extraDetails.forEach((item) => lines.push(`• ${item}`));
  }

  lines.push("", "📌 *Next step:* Reply in the thread with the details above and tag @BizOps.");

  return lines.join("\n");
}