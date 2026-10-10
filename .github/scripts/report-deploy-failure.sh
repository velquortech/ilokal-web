#!/usr/bin/env bash
# Turn a finished "Deploy Supabase Migrations" run into issue state: one open
# issue per failing job, closed again by the first run where that job passes.
#
# Why per job: from 2026-08-18 the run was red on every merge because the
# Production-preview smoke test failed, while Deploy-migration kept applying
# migrations. Red became normal, so when Deploy-migration itself started
# failing on 2026-10-09 (an invalid SUPABASE_ACCESS_TOKEN) nothing looked
# different and migrations silently stopped reaching production. A separate
# issue per job keeps "the smoke test is flaky" from hiding "production is
# missing migrations".
#
# Per job in the run:
#   failed (failure / timed_out / startup_failure)
#     -> no open issue for it: open one, assigned to whoever triggered the run;
#     -> already open: comment on it, so repeats are one thread, not a pile.
#   succeeded -> an open issue for it is closed with a "recovered" note.
#   skipped / cancelled -> says nothing about the job; left alone.
#
# Env: RUN_ID (required), GH_TOKEN, GITHUB_REPOSITORY (owner/repo; defaults to
# the current gh repo), DRY_RUN=1 to print the actions instead of taking them.

set -euo pipefail

: "${RUN_ID:?RUN_ID is required}"
REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
LABEL="deploy-failure"
DRY_RUN="${DRY_RUN:-0}"

run() {
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    echo
  else
    "$@"
  fi
}

meta=$(gh api "repos/$REPO/actions/runs/$RUN_ID")
read -r head_sha branch run_url actor < <(jq -r \
  '[.head_sha, .head_branch, .html_url, (.triggering_actor.login // .actor.login)] | @tsv' <<<"$meta")
title_line=$(jq -r '.display_title' <<<"$meta")
short_sha=${head_sha:0:7}

jobs=$(gh api "repos/$REPO/actions/runs/$RUN_ID/jobs?per_page=100" \
  --jq '[.jobs[] | {id, name, conclusion}]')

# Matrix jobs are named "Job (ubuntu-latest)"; the issue tracks the job, not
# the runner, so the suffix is dropped from the key.
job_key() { sed 's/ (.*)$//' <<<"$1"; }
marker() { echo "<!-- deploy-failure-job: $1 -->"; }

open_issue_for() {
  gh issue list --repo "$REPO" --label "$LABEL" --state open --limit 100 \
    --json number,body |
    jq -r --arg m "$(marker "$1")" '[.[] | select(.body | contains($m))][0].number // empty'
}

log_tail() {
  # Secrets are masked (***) by Actions before logs are stored. Strip the
  # "job<TAB>step<TAB>timestamp " prefix and colour codes (raw ESC or the
  # literal "^[" the log API sometimes returns), then end the excerpt at the
  # last ##[error] — after it comes post-job cleanup, which would otherwise
  # push the actual error out of a 25-line window.
  gh run view "$RUN_ID" --repo "$REPO" --job "$1" --log-failed 2>/dev/null |
    sed -E 's/^[^\t]*\t[^\t]*\t[^ ]* //; s/(\x1b|\^\[)\[[0-9;]*m//g' |
    grep -v '^##\[\(group\|endgroup\)\]' |
    awk '{ line[NR] = $0 } /^##\[error\]/ { last = NR }
         END { if (!last) last = NR; for (i = 1; i <= last; i++) print line[i] }' |
    tail -n 25 || true
}

what_it_means() {
  case "$1" in
    Deploy-migration)
      echo "🔴 **Migrations merged to \`main\` are NOT on production.** Code that depends on them is live without its schema. Every later merge that adds a migration piles onto the backlog until this job passes again."
      echo
      echo "To see exactly what the cloud is missing, run \`supabase/reports/cloud_drift_probe.sql\` against production. After fixing the cause, re-run the failed job: it applies every pending migration (\`--include-all\`)."
      ;;
    *)
      echo "Migrations are unaffected by this job. It runs after them, but a red run hides a real migration failure behind it, so it is still worth fixing."
      ;;
  esac
}

failed_any=0
while IFS=$'\t' read -r job_id name conclusion; do
  key=$(job_key "$name")
  existing=$(open_issue_for "$key")

  case "$conclusion" in
    failure | timed_out | startup_failure)
      failed_any=1
      tail_text=$(log_tail "$job_id")
      details="Run: $run_url"$'\n'"Commit: $short_sha ($title_line)"$'\n'"Conclusion: \`$conclusion\`"
      details+=$'\n\n'"<details><summary>Last lines of the failed log</summary>"$'\n\n```\n'"$tail_text"$'\n```\n</details>'

      if [[ -n "$existing" ]]; then
        echo "$key failed again; commenting on #$existing"
        run gh issue comment "$existing" --repo "$REPO" \
          --body "Still failing on \`$branch\`."$'\n\n'"$details"
      else
        echo "$key failed; opening an issue"
        run gh label create "$LABEL" --repo "$REPO" --color D93F0B \
          --description "A deploy job on main is failing" --force
        body="$(marker "$key")"$'\n'"The \`$key\` job of **Deploy Supabase Migrations** failed on \`$branch\`."
        body+=$'\n\n'"$(what_it_means "$key")"
        body+=$'\n\n'"$details"
        body+=$'\n\n'"<sub>Opened by the deploy-failure workflow. Closed automatically by the first run where \`$key\` passes.</sub>"
        title="Deploy failing on $branch: $key"
        [[ "$key" == Deploy-migration ]] && title="🔴 Migrations not reaching production: $key failing on $branch"
        # Assigning can fail (e.g. the actor is a bot): fall back to unassigned.
        run gh issue create --repo "$REPO" --title "$title" --label "$LABEL" \
          --assignee "$actor" --body "$body" ||
          run gh issue create --repo "$REPO" --title "$title" --label "$LABEL" --body "$body"
      fi
      ;;
    success)
      if [[ -n "$existing" ]]; then
        echo "$key passed; closing #$existing"
        run gh issue close "$existing" --repo "$REPO" \
          --comment "✅ \`$key\` passed again in $run_url ($short_sha). Closing."
      else
        echo "$key passed"
      fi
      ;;
    *) echo "$key: $conclusion (no change)" ;;
  esac
done < <(jq -r '.[] | [.id, .name, (.conclusion // "none")] | @tsv' <<<"$jobs")

# A failure is reported through the issue, not by failing this workflow too.
[[ "$failed_any" == 1 ]] && echo "Reported failing job(s) for run $RUN_ID."
exit 0
