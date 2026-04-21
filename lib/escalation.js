export function buildEscalationMessage({
  issueSummary = "This looks like a BizOps issue.",
  recordLink = "[add record link]",
  whatTried = "[add what you already tried]",
  urgency = "[add urgency / deadline]",
  extraDetails = [],
} = {}) {
  const extraLines =
    extraDetails.length > 0
      ? `\nAdditional context:\n${extraDetails.map((item) => `- ${item}`).join("\n")}`
      : "";

  return `Reply in this thread with:

- Issue: ${issueSummary}
- Record link: ${recordLink}
- What I’m trying to do: [add what you're trying to do]
- Exact error: [add exact error]
- What I already tried: ${whatTried}
- Urgency / deadline: ${urgency}${extraLines}

When you’ve added the details, tag @BizOps in this thread so the team gets notified.`;
}

export function shouldEscalate(category) {
  return category === "system_error" || category === "request_change";
}