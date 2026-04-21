export function classifyMessage(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("error") ||
    lower.includes("can't") ||
    lower.includes("cannot") ||
    lower.includes("blocked") ||
    lower.includes("validation") ||
    lower.includes("failed") ||
    lower.includes("locked")
  ) {
    return "system_error";
  }

  if (
    lower.startsWith("how do i") ||
    lower.startsWith("how can i") ||
    lower.includes("steps to") ||
    lower.includes("where do i")
  ) {
    return "seller_task";
  }

  if (
    lower.startsWith("what is") ||
    lower.startsWith("when do") ||
    lower.startsWith("why does") ||
    lower.includes("usually do")
  ) {
    return "simple_question";
  }

  if (
    lower.includes("change owner") ||
    lower.includes("ownership") ||
    lower.includes("merge") ||
    lower.includes("delete") ||
    lower.includes("split") ||
    lower.includes("update this for me")
  ) {
    return "request_change";
  }

  return "seller_task";
}

export function getMockBizOpsReply(text) {
  const category = classifyMessage(text);

  if (category === "system_error") {
    return {
      category,
      shouldEscalate: true,
      answer: `This looks like a system or admin-controlled issue.

Try these checks first:
- confirm all required fields are filled in
- confirm dates, products, and revenue schedules are complete
- confirm a contact role is added if you're moving stages
- retry after checking the record setup

If it's still blocked, reply in the #bizops_help thread with:
- record link
- what you're trying to do
- exact error
- what you've already tried
- urgency / deadline

Then tag @BizOps in the thread.`,
    };
  }

  if (category === "request_change") {
    return {
      category,
      shouldEscalate: false,
      answer: `This sounds like a BizOps-controlled request.

Next step:
- submit the correct Salesforce request if one exists
- if there is no clear request path or it is urgent, post in #bizops_help with the record link and reason
- if you already submitted the request, follow up in #bizops_help

Tag @BizOps in the thread if you escalate.`,
    };
  }

  if (category === "simple_question") {
    return {
      category,
      shouldEscalate: false,
      answer: `Here’s the quick answer:
- this looks like a general BizOps / process question
- use the BizOps Hub first for the current guidance
- if the process seems unclear, confirm with BizOps
- do not assume exceptions unless they are documented

Next step: check the BizOps Hub section tied to your workflow.`,
    };
  }

  return {
    category: "seller_task",
    shouldEscalate: false,
    answer: `Here’s what to do:
- open the relevant Salesforce record
- review the required fields and stage setup
- update the missing or incorrect fields
- confirm any dependent items like contact roles, dates, or schedules
- retry the action

Next step: make the updates and try again. If you hit a blocker, escalate in #bizops_help.`,
  };
}