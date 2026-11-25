import { describe, expect, it } from 'vitest';
import { LARGE_CHANGE_LINES, assessRisk, parseDiff } from '../scripts/risk-rules.js';

const DIFF = `diff --git a/src/status.js b/src/status.js
index 1111111..2222222 100644
--- a/src/status.js
+++ b/src/status.js
@@ -3,0 +4,2 @@ export async function fetchHealth(url, fetchFn = globalThis.fetch) {
+  // eslint-disable-next-line no-console
+  console.log(url);
@@ -10 +12 @@
-  return x;
+  return y;
diff --git a/tests/old.test.js b/tests/old.test.js
deleted file mode 100644
index 3333333..0000000
--- a/tests/old.test.js
+++ /dev/null
@@ -1,2 +0,0 @@
-line one
-line two
diff --git a/docs/a.md b/docs/b.md
similarity index 100%
rename from docs/a.md
rename to docs/b.md
`;

// Minimal file record for rule tests.
const file = (path, extra = {}) => ({ path, status: 'modified', additions: 1, deletions: 0, addedLines: [], ...extra });
const titles = (findings) => findings.map((f) => f.title);

describe('parseDiff', () => {
  it('extracts paths, statuses, counts and added line numbers', () => {
    expect(parseDiff(DIFF)).toEqual([
      {
        path: 'src/status.js',
        status: 'modified',
        additions: 3,
        deletions: 1,
        addedLines: [
          { line: 4, text: '  // eslint-disable-next-line no-console' },
          { line: 5, text: '  console.log(url);' },
          { line: 12, text: '  return y;' },
        ],
      },
      { path: 'tests/old.test.js', status: 'deleted', additions: 0, deletions: 2, addedLines: [] },
      { path: 'docs/b.md', status: 'renamed', additions: 0, deletions: 0, addedLines: [] },
    ]);
  });

  it('returns nothing for an empty diff', () => {
    expect(parseDiff('')).toEqual([]);
  });
});

describe('assessRisk', () => {
  it('flags nothing for a docs-only change', () => {
    expect(assessRisk([file('README.md')])).toEqual([]);
  });

  it('flags CI, dependency, tooling and health-check paths', () => {
    expect(
      titles(assessRisk([file('.github/workflows/ci.yml'), file('package.json'), file('vite.config.js'), file('src/health.js'), file('tests/health.test.js')])),
    ).toEqual(['CI config changed', 'Dependencies or npm scripts changed', 'Build or lint config changed', 'Health check changed']);
  });

  it('flags source changes with no test changes', () => {
    expect(titles(assessRisk([file('src/main.js')]))).toEqual(['Source changed without test changes']);
    expect(assessRisk([file('src/main.js'), file('tests/status.test.js')])).toEqual([]);
  });

  it('does not ask for tests when source is only deleted or is CSS', () => {
    expect(assessRisk([file('src/old.js', { status: 'deleted' }), file('src/style.css')])).toEqual([]);
  });

  it('flags focused/skipped tests and lint suppressions with their line numbers', () => {
    const findings = assessRisk([
      file('tests/a.test.js', {
        addedLines: [
          { line: 3, text: "it.only('x', () => {});" },
          { line: 7, text: "describe.skip('y', () => {});" },
          { line: 9, text: '/* eslint-disable */' },
        ],
      }),
    ]);
    expect(findings.map(({ title, line }) => [title, line])).toEqual([
      ['Focused or skipped test', 3],
      ['Focused or skipped test', 7],
      ['Lint rule disabled', 9],
    ]);
  });

  it("does not flag patterns inside the risk checker's own files", () => {
    const addedLines = [{ line: 1, text: '/* eslint-disable */' }];
    expect(assessRisk([file('scripts/risk-rules.js', { addedLines }), file('tests/risk-rules.test.js', { addedLines })])).toEqual([]);
  });

  it('flags elevated workflow permissions', () => {
    const findings = assessRisk([
      file('.github/workflows/x.yml', { addedLines: [{ line: 2, text: '  pull-requests: write' }] }),
    ]);
    expect(titles(findings)).toEqual(['CI config changed', 'Elevated workflow permissions']);
  });

  it('flags deleted test files', () => {
    expect(titles(assessRisk([file('tests/old.test.js', { status: 'deleted' })]))).toEqual(['Test file deleted']);
  });

  it('flags large changes but ignores the lockfile', () => {
    const big = file('README.md', { additions: LARGE_CHANGE_LINES + 1 });
    expect(titles(assessRisk([big]))).toEqual(['Large change']);
    const lock = file('package-lock.json', { additions: 5000 });
    expect(titles(assessRisk([lock]))).toEqual(['Dependencies or npm scripts changed']);
  });
});
