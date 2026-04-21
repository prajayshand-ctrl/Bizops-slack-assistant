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
    lower === "it still isn't working"
  );
}

export function getMockBizOpsReply(text, priorState = {}) {
  const lower = text.toLowerCase();
  const category = classifyMessage(text);

  if (isFollowUpMessage(text)) {
    if (priorState.lastCategory === "system_error") {
      return {
        category: "system_error",
        shouldEscalate: true,
        answer: `Got it — if the issue is still happening after the basic checks, this likely needs BizOps help.

Next step:
• reply in the thread with the record link
• include the exact error
• say what you already tried
• include urgency / deadline

Then tag @BizOps in the thread.`,
      };
    }

    if (priorState.lastCategory === "simple_question") {
      return {
        category: "simple_question",
        shouldEscalate: false,
        answer: `Got it — what specifically still isn’t working?

Helpful details:
• what report, dashboard, or view you’re looking at
• what number or behavior looks off
• what you expected to see instead

Next step: send the specific mismatch and I’ll help narrow it down.`,
      };
    }

    if (priorState.lastCategory === "request_change") {
      return {
        category: "request_change",
        shouldEscalate: false,
        answer: `Got it — if the request path still isn’t working, check whether:
• you’re using the correct Salesforce request type
• the record link is included
• the request reason is clear

If the path is unclear or blocked, post in #bizops_help with the record link and reason.

Next step: confirm the request path first, then escalate only if needed.`,
      };
    }

    return {
      category: priorState.lastCategory || "seller_task",
      shouldEscalate: false,
      answer: `Got it — tell me which step failed and what you’re seeing now.

Helpful details:
• the exact step you took
• the record link if relevant
• the exact error if there is one

Next step: send those details and I’ll narrow it down.`,
    };
  }

  if (lower.includes("how do i create an opportunity")) {
    return {
      category: "seller_task",
      shouldEscalate: false,
      answer: `Do this:
• Open the correct Account in Salesforce
• Click New Opportunity
• Select the right record type
• Fill in the required fields
• Save, then add products / schedules if needed

Next step: create the opp in Stage 1 and complete the required setup.`,
    };
  }

  if (
    lower.includes("can't move") &&
    (lower.includes("stage 2") || lower.includes("closed won") || lower.includes("negotiation"))
  ) {
    return {
      category: "system_error",
      shouldEscalate: true,
      answer: `This looks like a stage validation issue.

Check these first:
• Confirm the opp started in Stage 1
• Add a Contact Role if you're moving to Stage 2
• Confirm Flight Start, Flight End, Close Date, and Revenue Schedules are filled in if you're moving to Negotiation
• If Closed Won, confirm Reason, Sub-reason, and Notes are complete

If it's still blocked, reply in the #bizops_help thread with:
• opp link
• current stage
• exact error
• what you already tried

Then tag @BizOps in the thread.`,
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
      answer: `This is a BizOps-controlled change.

What to do:
• Submit the Account Request in Salesforce
• Use the ownership transfer request path
• Include the account link and reason for the change
• If the request is urgent or the path is unclear, post in #bizops_help with the account link

Next step: submit the request first, then follow up in #bizops_help only if needed.`,
    };
  }

  if (lower.includes("weighted pipeline")) {
    return {
      category: "simple_question",
      shouldEscalate: false,
      answer: `Weighted pipeline is expected revenue adjusted by deal probability.
• It uses stage likelihood, not just raw pipeline
• It helps make forecast views more realistic
• It is useful for comparing likely revenue vs total open pipeline

Next step: review the forecast view you’re using and confirm whether it shows weighted or raw pipeline.`,
    };
  }

  if (category === "system_error") {
    return {
      category,
      shouldEscalate: true,
      answer: `This looks like a system or admin-controlled issue.

Check these first:
• required fields
• contact roles
• dates
• products / revenue schedules

If it’s still blocked, post in #bizops_help with:
• record link
• what you're trying to do
• exact error
• what you've already tried

Then tag @BizOps in the thread.`,
    };
  }

  if (category === "request_change") {
    return {
      category,
      shouldEscalate: false,
      answer: `This sounds like a BizOps-controlled request.

What to do:
• use the correct Salesforce request path if one exists
• do not rely on Slack as the primary workflow
• if the request path is unclear, post in #bizops_help with the record link and reason

Next step: submit the request or escalate with the record link.`,
    };
  }

  if (category === "simple_question") {
    return {
      category,
      shouldEscalate: false,
      answer: `Here’s the quick answer:
• this is a general process / learning question
• check the BizOps Hub first for the documented workflow
• confirm with BizOps if the case seems unusual

Next step: review the related BizOps Hub section.`,
    };
  }

  return {
    category: "seller_task",
    shouldEscalate: false,
    answer: `Here’s what to do:
• open the relevant Salesforce record
• review the required fields and setup
• update the missing or incorrect values
• retry the action

Next step: make the update and try again.`,
  };
}