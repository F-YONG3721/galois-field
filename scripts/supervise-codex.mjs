#!/usr/bin/env node
/**
 * Safe bounded headless Codex supervisor. No third-party npm dependencies.
 * Intended for an isolated Linux VM/container on branch feature/build-calculator.
 * Uses host-side logs OUTSIDE the Codex repository. Fail-closed on anomalies.
 * Does not claim to replace OS permissions/resource cgroups or protect against a malicious same-user process.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const CODES = Object.freeze({ COMPLETED: 0, BLOCKED: 2, FAILED: 3, ABORTED: 4, SUPERVISOR_ERROR: 5 });
const EXPECTED_BRANCH = 'feature/build-calculator';
const COMPONENTS = ['prime-field', 'polynomial', 'algorithms', 'finite-field', 'trace'];
const ALL_TESTS = ['prime-field','polynomial','polynomial-division','euclidean','irreducible','extension-field','field-element','trace','properties','integration'].map(x=>`tests/${x}.test.ts`);
const PHASES = [
  { id: 'P0', requirements: [], files: [], instruction: 'Freeze compatible module APIs and shared types. Review docs/math-spec.md, docs/api-contract.md, docs/test-plan.md; create lib/galois/types.ts and index.ts only if needed. No other code until contract is coherent.' },
  { id: 'P1', requirements: ['prime-field'], files: ['tests/prime-field.test.ts'], instruction: 'Implement prime-field-dev with independent prime-field-test. Prepare trace interfaces with trace-dev in parallel only if contract is final. Record expected and actual with observeCase.' },
  { id: 'P2', requirements: ['prime-field', 'polynomial', 'algorithms'], files: ['tests/prime-field.test.ts','tests/polynomial.test.ts','tests/polynomial-division.test.ts','tests/euclidean.test.ts','tests/irreducible.test.ts'], instruction: 'Implement polynomial arithmetic and polynomial-division, independently test; then extended Euclid and irreducibility independently test. Sequence dependent operations; parallelize disjoint tasks.' },
  { id: 'P3', requirements: COMPONENTS, files: ['tests/prime-field.test.ts','tests/polynomial.test.ts','tests/polynomial-division.test.ts','tests/euclidean.test.ts','tests/irreducible.test.ts','tests/extension-field.test.ts','tests/field-element.test.ts','tests/trace.test.ts','tests/properties.test.ts'], instruction: 'Implement extension field / field elements and structured trace recording; independent testers validate known answers, field laws, mismatched fields, trace content, exhaustive small field cases.' },
  { id: 'P4', requirements: COMPONENTS, files: [], instruction: 'Resolve only remaining integration defects. Run complete test suite, preserve slides, ensure index exports and architectural boundaries. No UI or deployment work.' },
];
const DEFAULTS = { taskMs: 15 * 60_000, idleMs: 8 * 60_000, totalMs: 3 * 60 * 60_000, maxRepairs: 2, pollMs: 1800 };
const SYSTEM_PROTECTED = ['AGENTS.md','.codex/','scripts/supervise-codex.mjs','scripts/selftest-supervisor.mjs','scripts/export-test-report.mjs','vitest.config.ts','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','package-lock.json','slides.md','pages/','snippets/','components/','netlify.toml','vercel.json','.gitignore','docs/roadmap.md','tests/helpers/','tests/fixtures/'];
const pad = n => String(n).padStart(2, '0');
const stamp = () => { const d = new Date(); return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
const iso = () => new Date().toISOString();
function parseArgs(argv) {
  const mode = argv.includes('--run') ? 'run' : argv.includes('--check') ? 'check' : null;
  if (!mode || (argv.includes('--run') && argv.includes('--check'))) throw new Error('usage: node scripts/supervise-codex.mjs --check | --run [--repo /absolute/path]');
  const idx = argv.indexOf('--repo');
  if (idx >= 0 && !argv[idx+1]) throw new Error('--repo requires a path');
  return { mode, repo: path.resolve(idx >= 0 ? argv[idx+1] : process.cwd()) };
}
function strictPositiveEnv(name, value, minimum=1) {
  const raw = process.env[name];
  if (raw === undefined) return value;
  const v = Number(raw);
  if (!Number.isSafeInteger(v) || v < minimum) throw new Error(`${name} must be an integer >=${minimum}`);
  return v;
}
function cmdSync(command, args, cwd, timeout=10_000) {
  const r = spawnSync(command, args, { cwd, encoding:'utf8', timeout, maxBuffer: 4 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${String(r.error?.message ?? r.stderr ?? r.status).slice(0,500)}`);
  return r.stdout.trim();
}
function git(repo, args) { return cmdSync('git', args, repo); }
function allowed(file) {
  return file === 'agenda.md' || ['docs/architecture.md','docs/math-spec.md','docs/api-contract.md','docs/test-plan.md'].includes(file) ||
    (file.startsWith('lib/galois/') && !file.includes('..')) || /^tests\/[a-z0-9-]+\.test\.ts$/.test(file);
}
function changes(repo) {
  const raw = spawnSync('git', ['status','--porcelain=v1','-z','--untracked-files=all'], { cwd:repo, encoding:'utf8', maxBuffer:4*1024*1024 });
  if (raw.error || raw.status !== 0) throw new Error('Unable to read git status');
  const parts = raw.stdout.split('\0'); const result=[];
  for (let i=0; i<parts.length && parts[i]; i++) {
    const item=parts[i], xy=item.slice(0,2), file=item.slice(3);
    result.push({ xy, file });
    if (xy.includes('R') || xy.includes('C')) { i++; if (parts[i]) result.push({ xy, file:parts[i] }); }
  }
  return result;
}
const sanitize = text => String(text).replace(/sk-[a-zA-Z0-9_-]{18,}/g,'[REDACTED_TOKEN]').replace(/ghp_[a-zA-Z0-9]{20,}/g,'[REDACTED_TOKEN]').replace(/github_pat_[a-zA-Z0-9_]{20,}/g,'[REDACTED_TOKEN]').replace(/(authorization\s*:\s*bearer\s+)\S+/ig,'$1[REDACTED]');
function writeAtomic(file, payload) {
  const tmp = `${file}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(tmp, JSON.stringify(payload,null,2)+'\n', { mode:0o600 });
  fs.renameSync(tmp,file);
}
function privateDir(file) { fs.mkdirSync(file,{recursive:true,mode:0o700}); try { fs.chmodSync(file,0o700); } catch {} }
function privateAppend(file, text) { fs.appendFileSync(file,sanitize(text),{encoding:'utf8',flag:'a',mode:0o600}); }
function packageHasBuild(repo) {
  try {const pkg=JSON.parse(fs.readFileSync(path.join(repo,'package.json'),'utf8'));return Boolean(pkg.scripts?.build);}catch{return false;}
}
function preflight(repo, opts={deps:true}) {
  if (!fs.existsSync(path.join(repo,'AGENTS.md'))) throw new Blocked('Missing AGENTS.md; copy and commit the overlay before launch.');
  if (!fs.existsSync(path.join(repo,'.codex/config.toml'))) throw new Blocked('Missing Codex config');
  if (git(repo,['rev-parse','--show-toplevel']) !== fs.realpathSync(repo)) throw new Blocked('Run only from repository root');
  const branch = git(repo,['branch','--show-current']);
  if (branch !== EXPECTED_BRANCH) throw new Blocked(`Wrong branch '${branch}'; expected '${EXPECTED_BRANCH}'`);
  if (changes(repo).length) throw new Blocked('Working tree not clean. Commit scaffold and user work before running. No automatic reset/cleanup.');
  const head = git(repo,['rev-parse','HEAD']);
  if (!fs.existsSync(path.join(repo,'package.json'))) throw new Blocked('Missing existing Slidev package.json');
  const codexBin = process.env.GF_CODEX_BIN || 'codex';
  const pnpmBin = process.env.GF_PNPM_BIN || 'pnpm';
  const testCmd = (bin,args) => {
    const out=spawnSync(bin,args,{cwd:repo,encoding:'utf8',timeout:25_000,maxBuffer:512*1024});
    if(out.error || out.status!==0) throw new Blocked(`${bin} unavailable: ${out.error?.message??(out.stderr||out.stdout).slice(0,250)}. See SETUP.md`);
  };
  if (opts.deps) { testCmd(codexBin,['--version']); testCmd(pnpmBin,['--version']); testCmd(pnpmBin,['exec','vitest','--version']); }
  return { branch, head, codexBin, pnpmBin };
}
class Blocked extends Error {};
class Aborted extends Error {};
class Failed extends Error {};
let interrupted = null, childProcess = null;
function killGroup(child, signal='SIGTERM') {
  if (!child || !child.pid) return;
  try { if(process.platform==='win32') child.kill(signal); else process.kill(-child.pid,signal); } catch { try { child.kill(signal); } catch {} }
}
process.on('SIGINT',()=>{interrupted='SIGINT';killGroup(childProcess);});
process.on('SIGTERM',()=>{interrupted='SIGTERM';killGroup(childProcess);});

async function runChild(executable,args,{repo,timeoutMs,idleMs,logfile,stderrFile,stdin='',watch=null,envExtras={}}) {
  const started=Date.now(); let last=started, timedOut=false, idle=false, unsafe=null, completedEvent=false, sawEvent=false, tail='', stopAt=null;
  const child = spawn(executable,args,{cwd:repo,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe'],env:{...process.env,...envExtras,CI:'1'}});
  childProcess=child;
  child.stdin.on('error',()=>{});child.stdin.end(stdin);
  let pending='';
  child.stdout.on('data', chunk => {
    last=Date.now();const str=chunk.toString('utf8');pending+=str;
    let idx;
    while((idx=pending.indexOf('\n'))>=0) {
      const line=pending.slice(0,idx);pending=pending.slice(idx+1);
      privateAppend(logfile,line+'\n');
      tail=(tail+'\n'+sanitize(line)).slice(-6000);
      try { const ev=JSON.parse(line);sawEvent=true;if(ev.type==='turn.completed') completedEvent=true; } catch {}
    }
  });
  child.stderr.on('data',chunk=>{last=Date.now();const s=chunk.toString('utf8');privateAppend(stderrFile,s);tail=(tail+'\n'+sanitize(s)).slice(-6000);});
  let inspectionBusy=false;
  const poll=setInterval(()=>{
    const stop = () => { if (stopAt === null) { stopAt=Date.now(); killGroup(child,'SIGTERM'); } else if (Date.now()-stopAt>4000) killGroup(child,'SIGKILL'); };
    if (interrupted) {unsafe=unsafe||`External ${interrupted}`;stop();return;}
    if (Date.now()-started>timeoutMs) {timedOut=true;stop();return;}
    if (Date.now()-last>idleMs) {idle=true;stop();return;}
    if(unsafe) {stop();return;}
    if (watch && !inspectionBusy) {
      inspectionBusy=true;
      try { const err=watch();if(err) { unsafe=err;stopAt=Date.now();killGroup(child,'SIGTERM'); } } catch(e){unsafe=`Monitor failed: ${e.message}`;stopAt=Date.now();killGroup(child,'SIGTERM');}
      finally { inspectionBusy=false; }
    }
  },Math.min(2000,strictPositiveEnv('GF_POLL_MS',DEFAULTS.pollMs,300)));
  const result=await new Promise(resolve=>{
    child.once('error',e=>resolve({code:null,error:e.message,signal:null}));
    child.once('close',(code,signal)=>resolve({code,error:null,signal}));
  });
  clearInterval(poll);
  if(pending) {privateAppend(logfile,pending+'\n');tail=(tail+'\n'+sanitize(pending)).slice(-6000);}
  childProcess=null;
  // A process ignoring SIGTERM is forcibly terminated after a grace period by a separately scheduled timeout.
  return {...result,elapsedMs:Date.now()-started,timedOut,idle,unsafe,completedEvent,sawEvent,tail};
}
function sha256File(p) { return createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function freezeContracts(repo) {
  return Object.fromEntries(['docs/math-spec.md','docs/api-contract.md','docs/test-plan.md'].map(p=>[p,sha256File(path.join(repo,p))]));
}
function watchedState(repo,expectedHead,frozen={}) {
  for (const [file,digest] of Object.entries(frozen)) {
    try { if (sha256File(path.join(repo,file))!==digest) return `Frozen contract modified: ${file}`; }
    catch { return `Frozen contract missing: ${file}`; }
  }
  const head=git(repo,['rev-parse','HEAD']);
  if(head!==expectedHead) return 'Unauthorized Git HEAD change during Codex execution';
  if(git(repo,['branch','--show-current'])!==EXPECTED_BRANCH) return 'Unauthorized branch switch';
  const bad=changes(repo).filter(c=>!allowed(c.file) && !c.file.startsWith('reports/tests/'));
  return bad.length ? `Unauthorized file change: ${bad.map(x=>x.file).slice(0,8).join(', ')}` : null;
}
function captureChanges(repo,runDir) {
  try {
    const patch=spawnSync('git',['diff','--binary','HEAD'],{cwd:repo,encoding:'utf8',maxBuffer:15*1024*1024});
    if(!patch.error && patch.status===0) fs.writeFileSync(path.join(runDir,'changes.patch'),sanitize(patch.stdout),{mode:0o600});
    const untracked=changes(repo).filter(x=>x.xy==='??');
    const saved=[];
    for(const {file} of untracked) {
      if(!allowed(file)) continue;
      const source=path.resolve(repo,file);
      if(!source.startsWith(repo+path.sep)) continue;
      try {
        const st=fs.lstatSync(source);
        if(!st.isFile() || st.size>1_000_000) continue;
        const dest=path.join(runDir,'untracked',file);
        fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
        fs.copyFileSync(source,dest);saved.push(file);
      } catch {}
    }
    writeAtomic(path.join(runDir,'untracked-manifest.json'),{files:saved});
  } catch(e) {privateAppend(path.join(runDir,'errors.log'),`Snapshot failure: ${e.message}\n`);}
}
function updateAgenda(repo,phase,status) {
  const file=path.join(repo,'agenda.md');
  let value=fs.readFileSync(file,'utf8');
  const prefix=`| ${phase} |`;
  const lines=value.split('\n');
  const idx=lines.findIndex(x=>x.startsWith(prefix));
  if(idx<0) throw new Blocked(`Missing agenda row ${phase}`);
  const cells=lines[idx].split('|');
  if(cells.length<8) throw new Blocked('Malformed agenda row');
  cells[cells.length-2]=` ${status} `;
  lines[idx]=cells.join('|');
  fs.writeFileSync(file,lines.join('\n'));
}
function checkpoint(repo,phase) {
  const all=changes(repo).filter(x=>!x.file.startsWith('reports/tests/'));
  const bad=all.filter(x=>!allowed(x.file));
  if(bad.length) throw new Aborted(`Refuse to commit unauthorized files: ${bad.map(x=>x.file).join(', ')}`);
  const paths=[...new Set(all.map(x=>x.file))];
  if(paths.length) {
    git(repo,['add','-A','--',...paths]);
    git(repo,['commit','-m',`codex(calculator): ${phase} verified checkpoint`]);
  }
  return git(repo,['rev-parse','HEAD']);
}
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function checkRequirements(repo,phase) {
  const must=['AGENTS.md','agenda.md','docs/math-spec.md','docs/api-contract.md','docs/test-plan.md'];
  for(const file of must) { const p=path.join(repo,file);if(!fs.existsSync(p) || fs.statSync(p).size<80) throw new Blocked(`Missing/empty required contract: ${file}`);}
  if(phase.id!=='P0') {
    for(const file of phase.files){if(!fs.existsSync(path.join(repo,file)))throw new Failed(`Missing test suite: ${file}`);}
  }
}
function phasePrompt(phase,repair,history) {
  return `You are the Codex coordinator implementing Galois Field core in an existing Slidev repository.\n`
  +`This run is non-interactive and externally supervised. Branch is ${EXPECTED_BRANCH}. Read AGENTS.md, agenda.md, docs/math-spec.md, docs/api-contract.md, docs/test-plan.md.\n`
  +`Work exclusively on ${phase.id}. Task: ${phase.instruction}\n`
  +`Delegate to exact custom agents defined in .codex/agents; at most 3 concurrent. Do NOT change protected files, install dependencies, alter accepted fixtures, commit, push, deploy, or change Slidev.\n`
  +`Use test agents independently; every acceptance case MUST call observeCase. Make real source and test changes, not placeholders.\n`
  +`Repair attempt: ${repair} (0 means first attempt); at most 2 retries.\n`
  +(history ? `External verifier failed with: ${history.slice(-4500)}\nInvestigate and fix without weakening tests.\n` : '')
  +`If math/API/permission conflict cannot be solved within authorization, reply BLOCKED: <reason> and stop. End with changed paths and tests executed. Do not claim acceptance before supervisor verifies.`;
}
function mirrorReports(repo,runId,runDir) {
  const target=path.join(repo,'reports','tests',runId);
  fs.mkdirSync(target,{recursive:true});
  for(const name of ['prime-field.json','prime-field.md','polynomial.json','polynomial.md','algorithms.json','algorithms.md','finite-field.json','finite-field.md','trace.json','trace.md','summary.md','test-summary.json','run-status.json','failure-report.md']) {
    const src=path.join(runDir,name);if(fs.existsSync(src)) fs.copyFileSync(src,path.join(target,name));
  }
}
function failureReport(runDir,reason,status,meta) {
  const file=path.join(runDir,'failure-report.md');
  fs.writeFileSync(file,[`# Autonomous run failure / pause`,``,`- Status: **${status}**`,`- Time: ${iso()}`,
    `- Phase: ${meta.phase||'preflight'}`,`- Reason: ${sanitize(reason)}`,`- Initial Git SHA: ${meta.initialHead||'unavailable'}`,
    `- Last verified Git SHA: ${meta.lastHead||'unavailable'}`,`- Repairs attempted: ${meta.repairs??0}`,
    ``,`Diagnostics are in private external run logs. Uncommitted changes and untracked source copies are preserved where possible. No reset was performed.`,
    ``,`Resume only after human review; the next --run requires a clean authorized branch.`].join('\n')+'\n',{mode:0o600});
}
async function runSupervisor(repo) {
  const settings={
    taskMs:strictPositiveEnv('GF_TASK_TIMEOUT_MS',DEFAULTS.taskMs),
    idleMs:strictPositiveEnv('GF_IDLE_TIMEOUT_MS',DEFAULTS.idleMs),
    totalMs:strictPositiveEnv('GF_TOTAL_TIMEOUT_MS',DEFAULTS.totalMs),
    maxRepairs:strictPositiveEnv('GF_MAX_REPAIRS',DEFAULTS.maxRepairs,0)
  };
  const started=Date.now(),runId=`${stamp()}-${process.pid}`;
  const runRoot=path.resolve(process.env.GF_RUNLOG_DIR||`${repo}-codex-runlogs`);
  if(runRoot===repo || runRoot.startsWith(repo+path.sep)) throw new Blocked('GF_RUNLOG_DIR MUST be outside the workspace');
  privateDir(runRoot);
  const runDir=path.join(runRoot,runId);privateDir(runDir);
  const status={runId,status:'INITIALIZING',phase:null,initialHead:null,lastHead:null,startedAt:iso(),updatedAt:iso(),repairs:0,reportDir:runDir};
  const save=(s,extra={})=>{Object.assign(status,extra,{status:s,updatedAt:iso()});writeAtomic(path.join(runDir,'run-status.json'),status);};
  let previousFailure='';let currentPhase=null;let frozenContracts={};
  try {
    save('INITIALIZING');
    const info=preflight(repo);
    status.initialHead=info.head;status.lastHead=info.head;
    const existingConfig=fs.readFileSync(path.join(repo,'.codex/config.toml'),'utf8');
    if(!existingConfig.includes('workspace-write') || !existingConfig.includes('network_access = false')) throw new Blocked('Project Codex config is not set to restricted workspace and network');
    privateAppend(path.join(runDir,'supervisor.log'),`Run ${runId} started ${iso()} at ${info.head}\n`);
    for(const phase of PHASES) {
      currentPhase=phase;status.phase=phase.id;
      if(Date.now()-started>settings.totalMs) throw new Aborted('Total run deadline reached');
      // The phase worker may create its test files; verify suites only AFTER Codex returns.
      updateAgenda(repo,phase.id,'IN_PROGRESS');
      let accepted=false;
      for(let attempt=0;attempt<=settings.maxRepairs;attempt++) {
        status.repairs=attempt;
        save(attempt ? 'REPAIRING':'RUNNING');
        const events=path.join(runDir,`${phase.id}-attempt${attempt}-events.jsonl`);
        const errors=path.join(runDir,`${phase.id}-attempt${attempt}-stderr.log`);
        const headBefore=git(repo,['rev-parse','HEAD']);
        const task=await runChild(info.codexBin,['exec', '--json', '--sandbox', 'workspace-write', '-c', 'approval_policy="never"', '-'],{
          repo,timeoutMs:Math.min(settings.taskMs,settings.totalMs-(Date.now()-started)),idleMs:settings.idleMs,
          logfile:events,stderrFile:errors,stdin:phasePrompt(phase,attempt,previousFailure),
          watch:()=>watchedState(repo,headBefore,frozenContracts),
        });
        captureChanges(repo,runDir);
        const danger=task.unsafe||watchedState(repo,headBefore,frozenContracts);
        if(danger) throw new Aborted(danger);
        if(task.timedOut||task.idle||interrupted) throw new Aborted(`Codex timeout/idle/signal in ${phase.id}: ${interrupted ? 'interrupted' : task.timedOut ? 'time exceeded' : 'idle exceeded'}`);
        if(task.error || task.code!==0 || !task.completedEvent) {
          const msg=`Codex failed (${task.code}; terminal event=${task.completedEvent}): ${task.error||task.tail.slice(-900)}`;
          if(/blocked:|permission denied|requires approval|approval required|sandbox.*denied/i.test(task.tail)) throw new Blocked(msg);
          throw new Failed(msg);
        }
        if(/BLOCKED:/i.test(task.tail)) throw new Blocked(`Coordinator reported blocker: ${task.tail.slice(-1200)}`);
        save('TESTING');
        try { checkRequirements(repo,phase); } catch (e) {
          if (!(e instanceof Failed)) throw e;
          previousFailure=e.message;
          privateAppend(path.join(runDir,'errors.log'),`Missing phase output: ${previousFailure}\n`);
          if (attempt>=settings.maxRepairs) throw new Failed(`Repair limit exceeded: ${previousFailure}`);
          continue;
        }
        if(phase.id==='P0') { accepted=true; break; }
        const observationFile=path.join(runDir,`${phase.id}-attempt${attempt}-observations.jsonl`);
        fs.writeFileSync(observationFile,'',{mode:0o600});
        const files=phase.id==='P4'?[]:phase.files;
        const suiteRequirements=phase.id==='P4'?ALL_TESTS:phase.files;
        const test=await runChild(info.pnpmBin,['exec','vitest','run',...files],{
          repo, timeoutMs:Math.min(settings.taskMs,settings.totalMs-(Date.now()-started)),idleMs:settings.idleMs,
          logfile:path.join(runDir,`${phase.id}-attempt${attempt}-vitest.log`),stderrFile:path.join(runDir,`${phase.id}-attempt${attempt}-vitest-stderr.log`),
          watch:()=>watchedState(repo,headBefore,frozenContracts),
          stdin:'',
          envExtras:{GF_TEST_RECORDS:observationFile},
        });
        const testDanger=test.unsafe||watchedState(repo,headBefore,frozenContracts);
        if(testDanger) throw new Aborted(testDanger);
        if(test.timedOut||test.idle||interrupted) throw new Aborted('Vitest timeout, idle timeout or external signal');
        const report=await runChild(process.execPath,[path.join(repo,'scripts/export-test-report.mjs'),'--input',observationFile,'--out',runDir,'--require',phase.requirements.join(','),'--suites',suiteRequirements.map(x=>path.basename(x)).join(',')],{
          repo,timeoutMs:30_000,idleMs:30_000,logfile:path.join(runDir,`${phase.id}-report.log`),stderrFile:path.join(runDir,`${phase.id}-report-errors.log`)
        });
        if(report.code!==0 && !fs.existsSync(path.join(runDir,'test-summary.json'))) throw new Failed('Test report exporter malfunction; fail closed');
        const sum=readJson(path.join(runDir,'test-summary.json'));
        let buildOk=true;
        if(phase.id==='P4' && test.code===0 && report.code===0 && packageHasBuild(repo)) {
          const build=await runChild(info.pnpmBin,['run','build'],{repo,timeoutMs:settings.taskMs,idleMs:settings.idleMs,
            logfile:path.join(runDir,'build.log'),stderrFile:path.join(runDir,'build-stderr.log'),watch:()=>watchedState(repo,headBefore)});
          if(build.unsafe || watchedState(repo,headBefore,frozenContracts))throw new Aborted(build.unsafe||watchedState(repo,headBefore,frozenContracts));
          if(build.timedOut||build.idle||interrupted) throw new Aborted('Build timeout/idle/signal');
          buildOk=build.code===0;
        }
        if(test.code===0 && report.code===0 && sum.passed && buildOk) { accepted=true;break; }
        previousFailure=`phase ${phase.id} verification: vitest exit=${test.code} report exit=${report.code}, buildOk=${buildOk}, issues=${(sum.issues||[]).join('; ')}, tail=${test.tail.slice(-1200)}`;
        privateAppend(path.join(runDir,'errors.log'),previousFailure+'\n');
        if(attempt>=settings.maxRepairs) throw new Failed(`Repair limit exceeded: ${previousFailure}`);
      }
      if(!accepted) throw new Failed('No accepted outcome');
      if(watchedState(repo,git(repo,['rev-parse','HEAD']),frozenContracts)) throw new Aborted('Unsafe workspace at checkpoint');
      save('CHECKPOINTING');
      updateAgenda(repo,phase.id,'DONE');
      const sha=checkpoint(repo,phase.id);status.lastHead=sha;previousFailure='';
      if (phase.id==='P0') { frozenContracts=freezeContracts(repo);writeAtomic(path.join(runDir,'frozen-contract-hashes.json'),frozenContracts); }
      save('RUNNING',{lastHead:sha});
    }
    save('COMPLETED',{completedAt:iso()});
    mirrorReports(repo,runId,runDir);
    return CODES.COMPLETED;
  } catch(e) {
    const state=e instanceof Blocked?'BLOCKED':e instanceof Failed?'FAILED':e instanceof Aborted?'ABORTED':'SUPERVISOR_ERROR';
    const reason=sanitize(e.stack||e.message||String(e));
    save(state,{reason});
    privateAppend(path.join(runDir,'errors.log'),`${iso()} ${state}: ${reason}\n`);
    captureChanges(repo,runDir);
    failureReport(runDir,reason,state,{phase:currentPhase?.id,initialHead:status.initialHead,lastHead:status.lastHead,repairs:status.repairs});
    try {mirrorReports(repo,runId,runDir);}catch{}
    return CODES[state];
  }
}

try {
  const args=parseArgs(process.argv.slice(2));
  if(args.mode==='check'){
    const info=preflight(args.repo);
    console.log(JSON.stringify({ok:true,branch:info.branch,head:info.head,buildScript:packageHasBuild(args.repo),message:'Safe preflight passed; no Codex run was started.'},null,2));
  }else{
    const code=await runSupervisor(args.repo);
    console.log(`Supervisor finished with exit ${code}`);
    process.exitCode=code;
  }
} catch(e) {
  console.error(`${e instanceof Blocked?'BLOCKED':'SUPERVISOR_ERROR'}: ${sanitize(e.message||String(e))}`);
  process.exitCode=e instanceof Blocked?CODES.BLOCKED:CODES.SUPERVISOR_ERROR;
}
