#!/usr/bin/env node
// Standard Node.js only. Produces reports from OBSERVED Vitest acceptance cases.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1]) throw Error(`Bad argument ${argv[i]}`);
    opts[argv[i].slice(2)] = argv[i + 1];
  }
  if (!opts.input || !opts.out) throw Error('usage: node scripts/export-test-report.mjs --input observations.jsonl --out report-dir --require prime-field,polynomial');
  return opts;
}
const escaped = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/`/g, '\\`');
const display = value => JSON.stringify(value) ?? '(undefined)';
const required = ['prime-field', 'polynomial', 'algorithms', 'finite-field', 'trace'];
function generate(input, out, mandatory, suites) {
  mkdirSync(out, { recursive: true });
  const lines = existsSync(input) ? readFileSync(input, 'utf8').split('\n').filter(Boolean) : [];
  const cases = []; let malformed = 0;
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      if (!r.id || !r.component || !r.suite || !r.item || !('input' in r) || !('expected' in r) || !('actual' in r) || typeof r.passed !== 'boolean') { malformed++; continue; }
      cases.push(r);
    } catch { malformed++; }
  }
  const counts = {}, missing = [];
  const missingSuites = suites.filter(s => !cases.some(c => c.suite === s));
  for (const component of required) {
    const own = cases.filter(x => x.component === component);
    const pass = own.filter(x => x.passed).length;
    const fail = own.length - pass;
    counts[component] = { total: own.length, pass, fail };
    if (mandatory.includes(component) && !own.length) missing.push(component);
    const data = { component, cases: own, ...counts[component] };
    writeFileSync(join(out, `${component}.json`), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
    const md = [
      `# ${component} — actual test evidence`, '',
      `Total: ${own.length}; PASS: ${pass}; FAIL: ${fail}`, '',
      '| Test ID | Suite | Item | Input | Expected | Actual | Result | Report |',
      '|---|---|---|---|---|---|---|---|',
      ...own.map(r => `| ${escaped(r.id)} | ${escaped(r.suite)} | ${escaped(r.item)} | \`${escaped(display(r.input))}\` | \`${escaped(display(r.expected))}\` | \`${escaped(display(r.actual))}\` | ${r.passed ? 'PASS' : 'FAIL'} | ${escaped(r.note)} |`),
    ];
    writeFileSync(join(out, `${component}.md`), md.join('\n') + '\n', { mode: 0o600 });
  }
  const issues = [];
  if (missing.length) issues.push(`Missing mandatory case records: ${missing.join(', ')}`);
  if (missingSuites.length) issues.push(`No acceptance records from required test suites: ${missingSuites.join(', ')}`);
  if (malformed) issues.push(`${malformed} malformed observations`);
  const duplicates = cases.map(x => x.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  if (duplicates.length) issues.push(`Duplicate case IDs: ${[...new Set(duplicates)].join(', ')}`);
  if (cases.some(x => !x.passed)) issues.push('One or more mathematical acceptance cases FAILED');
  const passed = !issues.length && cases.length > 0;
  const summary = { passed, observations: cases.length, counts, missing, missingSuites, malformed, issues, generatedAt: new Date().toISOString() };
  writeFileSync(join(out, 'test-summary.json'), JSON.stringify(summary, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(join(out, 'summary.md'), [
    '# GF calculator — observed acceptance tests', '',
    `Status: **${passed ? 'PASS' : 'FAIL'}**`, '',
    '| Component | Cases | Passed | Failed |', '|---|---:|---:|---:|',
    ...Object.entries(counts).map(([name, c]) => `| ${name} | ${c.total} | ${c.pass} | ${c.fail} |`),
    '', '## Diagnostics', ...(!issues.length ? ['No missing observations or failed acceptance cases.'] : issues.map(x => `- ${x}`)),
    '', 'Note: This report reflects observed values and must be combined with the actual Vitest process exit code.',
  ].join('\n') + '\n', { mode: 0o600 });
  return summary;
}
try {
  const args = parseArgs(process.argv.slice(2));
  const mandatory = args.require ? args.require.split(',').filter(Boolean) : required;
  const invalid = mandatory.filter(v => !required.includes(v));
  if (invalid.length) throw Error(`Unknown components: ${invalid.join(', ')}`);
  const suites = args.suites ? args.suites.split(',').filter(Boolean) : [];
  const result = generate(resolve(args.input), resolve(args.out), mandatory, suites);
  console.log(JSON.stringify({ passed: result.passed, observations: result.observations, issues: result.issues }));
  process.exitCode = result.passed ? 0 : 1;
} catch (error) { console.error(String(error)); process.exitCode = 2; }
