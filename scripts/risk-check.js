#!/usr/bin/env node
/**
 * Flags risky changes between a base ref and HEAD. Advisory only: always exits 0
 * unless git itself fails. Lint and build failures are caught by the CI job.
 *
 *   node scripts/risk-check.js [base-ref]     (default: origin/main)
 *
 * In GitHub Actions it emits ::warning annotations and writes a job summary.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { assessRisk, parseDiff } from './risk-rules.js';

const base = process.argv[2] ?? 'origin/main';
const diff = execFileSync('git', ['diff', '-U0', '--find-renames', '--no-color', `${base}...HEAD`], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const files = parseDiff(diff);
const findings = assessRisk(files);
const inActions = process.env.GITHUB_ACTIONS === 'true';

// Workflow-command escaping: https://docs.github.com/actions/reference/workflow-commands-for-github-actions
const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = (s) => esc(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

for (const f of findings) {
  const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '';
  if (inActions) {
    const props = [f.file && `file=${escProp(f.file)}`, f.line && `line=${f.line}`, `title=${escProp(f.title)}`];
    console.log(`::warning ${props.filter(Boolean).join(',')}::${esc(f.message)}`);
  } else {
    console.log(`⚠ ${f.title}${where ? ` (${where})` : ''}\n  ${f.message}`);
  }
}

const header = `Risk check: ${files.length} file(s) changed vs ${base}, ${findings.length} finding(s).`;
console.log(findings.length ? `\n${header}` : `${header} Nothing to flag.`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  const rows = findings.map(
    (f) => `| ${cell(f.title)} | ${f.file ? `\`${cell(f.file)}${f.line ? `:${f.line}` : ''}\`` : '—'} | ${cell(f.message)} |`,
  );
  const body = findings.length
    ? ['| Finding | Where | Why it matters |', '| --- | --- | --- |', ...rows].join('\n')
    : 'No risky changes detected. ✅';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## PR risk check\n\n${header}\n\n${body}\n`);
}
