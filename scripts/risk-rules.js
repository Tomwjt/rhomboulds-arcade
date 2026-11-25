/**
 * Pure logic for the PR risk check: parse a unified diff and turn it into
 * findings. No I/O here so it can be unit tested (see tests/risk-rules.test.js).
 */

/**
 * Parses `git diff -U0 --find-renames` output.
 * @returns {{ path: string, status: 'added'|'deleted'|'modified'|'renamed', additions: number,
 *   deletions: number, addedLines: { line: number, text: string }[] }[]}
 */
export function parseDiff(diffText) {
  const files = [];
  let file = null;
  let newLine = 0;

  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      // Fallback path from the header; refined by the ---/+++/rename lines below.
      const m = raw.match(/ b\/(.+)$/);
      file = { path: m ? m[1] : '', status: 'modified', additions: 0, deletions: 0, addedLines: [] };
      files.push(file);
    } else if (!file) {
      continue;
    } else if (raw.startsWith('new file mode')) {
      file.status = 'added';
    } else if (raw.startsWith('deleted file mode')) {
      file.status = 'deleted';
    } else if (raw.startsWith('rename to ')) {
      file.status = 'renamed';
      file.path = raw.slice('rename to '.length);
    } else if (raw.startsWith('--- a/') && file.status === 'deleted') {
      file.path = raw.slice('--- a/'.length);
    } else if (raw.startsWith('+++ b/')) {
      file.path = raw.slice('+++ b/'.length);
    } else if (raw.startsWith('@@')) {
      const m = raw.match(/\+(\d+)/);
      newLine = m ? Number(m[1]) : 0;
    } else if (raw.startsWith('+') && !raw.startsWith('+++')) {
      file.additions++;
      file.addedLines.push({ line: newLine++, text: raw.slice(1) });
    } else if (raw.startsWith('-') && !raw.startsWith('---')) {
      file.deletions++;
    }
  }
  return files;
}

export const LARGE_CHANGE_LINES = 500;

const isTest = (p) => p.startsWith('tests/');
const isSourceJs = (p) => p.startsWith('src/') && p.endsWith('.js');

// The checker's own files contain the patterns below as literals; don't flag them.
const SELF = new Set(['scripts/risk-rules.js', 'tests/risk-rules.test.js']);

/** Rules that fire when a file at a matching path is touched. */
const PATH_RULES = [
  {
    title: 'CI config changed',
    match: (p) => p.startsWith('.github/'),
    message: 'This changes CI, which decides what can be merged. Check that lint, test and build still run and still block.',
  },
  {
    title: 'Dependencies or npm scripts changed',
    match: (p) => p === 'package.json' || p === 'package-lock.json',
    message: 'Review new or upgraded packages and any script changes. Every dependency ships to, or builds, the site.',
  },
  {
    title: 'Build or lint config changed',
    match: (p) => ['vite.config.js', 'eslint.config.js', '.nvmrc'].includes(p),
    message: 'This affects every build. vite.config.js also generates /health.json.',
  },
  {
    title: 'Health check changed',
    match: (p) => ['src/health.js', 'src/status.js'].includes(p),
    message: 'Deploy checks rely on the /health.json contract ({ status: "ok", ... }). Keep it backwards compatible.',
  },
];

/** Rules that fire on specific added lines. */
const LINE_RULES = [
  {
    title: 'Focused or skipped test',
    match: (p) => isTest(p),
    pattern: /\b(?:it|test|describe)\.(?:only|skip)\s*\(/,
    message: 'With .only or .skip, other tests silently stop running in CI.',
  },
  {
    title: 'Lint rule disabled',
    match: () => true,
    pattern: /eslint-disable/,
    message: 'Fix the lint issue instead of suppressing it, or explain why in the PR.',
  },
  {
    title: 'Elevated workflow permissions',
    match: (p) => p.startsWith('.github/workflows/'),
    pattern: /pull_request_target|:\s*write\b|write-all/,
    message: 'Write permissions or pull_request_target can expose secrets or the repo to untrusted PR code.',
  },
];

/**
 * @returns {{ title: string, message: string, file?: string, line?: number }[]}
 */
export function assessRisk(files) {
  const findings = [];

  for (const f of files) {
    for (const rule of PATH_RULES) {
      if (rule.match(f.path)) findings.push({ title: rule.title, message: rule.message, file: f.path });
    }
    for (const rule of LINE_RULES) {
      if (SELF.has(f.path) || !rule.match(f.path)) continue;
      for (const { line, text } of f.addedLines) {
        if (rule.pattern.test(text)) findings.push({ title: rule.title, message: rule.message, file: f.path, line });
      }
    }
    if (isTest(f.path) && f.status === 'deleted') {
      findings.push({ title: 'Test file deleted', message: 'Make sure the behaviour is still covered somewhere.', file: f.path });
    }
  }

  const changedSource = files.filter((f) => isSourceJs(f.path) && f.status !== 'deleted');
  if (changedSource.length > 0 && !files.some((f) => isTest(f.path))) {
    findings.push({
      title: 'Source changed without test changes',
      message: `Changed ${changedSource.map((f) => f.path).join(', ')} but nothing in tests/. Add or update tests, or say in the PR why none are needed.`,
    });
  }

  const size = files
    .filter((f) => f.path !== 'package-lock.json')
    .reduce((n, f) => n + f.additions + f.deletions, 0);
  if (size > LARGE_CHANGE_LINES) {
    findings.push({
      title: 'Large change',
      message: `${size} lines changed (excluding package-lock.json). Consider splitting it into smaller PRs.`,
    });
  }

  return findings;
}
