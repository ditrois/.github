'use strict';

// An allowlist: repositories absent from the policy never receive auto-assignees.
function assignmentFor(context, rules) {
  const issue = context.payload?.issue;
  if (context.eventName !== 'issues' || context.payload.action !== 'opened'
      || !issue || issue.pull_request || issue.assignees?.length) return null;
  const repository = context.payload.repository?.full_name?.toLowerCase();
  const policy = rules[repository];
  if (!policy) return null;
  const labels = (issue.labels ?? []).map(label => typeof label === 'string' ? label : label.name);
  if (policy.skip_labels.some(label => labels.includes(label))) return null;
  return policy.assignee;
}

async function assignIssue({ context, github, core, rules }) {
  // Read again: an assignee could have been added after the opened event.
  const candidate = assignmentFor(context, rules);
  if (!candidate) return;
  const latest = await github.rest.issues.get({
    ...context.repo, issue_number: context.payload.issue.number,
  });
  if (!assignmentFor({ ...context, payload: { ...context.payload, issue: latest.data } }, rules)) {
    core.info('Assignment skipped: current issue already assigned or excluded.');
    return;
  }
  await github.rest.issues.addAssignees({
    ...context.repo, issue_number: latest.data.number, assignees: [candidate],
  });
}
module.exports = { assignmentFor, assignIssue };
