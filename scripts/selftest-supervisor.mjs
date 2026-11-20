#!/usr/bin/env node
// Tests the supervisor with FAKE Codex and fake pnpm. Never calls real Codex or edits user work.
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SELF=path.join(ROOT,'scripts','supervise-codex.mjs');
const MOCK_CODEX=`#!/usr/bin/env node
import { mkdirSync,writeFileSync,appendFileSync } from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2);
if(args.includes('--version')) {console.log('fake-codex 1.0');process.exit(0)}
let prompt='';for await(const chunk of process.stdin)prompt+=chunk;
const phase=prompt.match(/Work exclusively on (P[0-4])/i)?.[1]||'P0';
const mode=process.env.GF_MOCK_MODE;
if(mode==='exit') {console.log(JSON.stringify({type:'turn.failed'}));process.exit(19)}
if(mode==='hang') {console.log(JSON.stringify({type:'turn.started'}));setInterval(()=>{},1000);await new Promise(()=>{});}
if(mode==='unauthorized'){writeFileSync('slides.md','unauthorized!');console.log(JSON.stringify({type:'turn.completed'}));process.exit(0)}
if(mode==='frozen' && phase==='P1'){writeFileSync('docs/math-spec.md','tampered math specification!');console.log(JSON.stringify({type:'turn.completed'}));process.exit(0)}
const files={P0:['lib/galois/types.ts'],P1:['tests/prime-field.test.ts','lib/galois/prime-field.ts'],P2:['tests/polynomial.test.ts','tests/polynomial-division.test.ts','tests/euclidean.test.ts','tests/irreducible.test.ts'],P3:['tests/extension-field.test.ts','tests/field-element.test.ts','tests/trace.test.ts','tests/properties.test.ts'],P4:['tests/integration.test.ts']};
for(const f of files[phase]){mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,'// Fake test fixture for supervisor simulation only\\n')}
console.log(JSON.stringify({type:'turn.started'}));
console.log(JSON.stringify({type:'item.completed', item:{type:'agent_message',text:'fake '+phase}}));
console.log(JSON.stringify({type:'turn.completed'}));
`;
const MOCK_PNPM=`#!/usr/bin/env node
import {appendFileSync} from 'node:fs';
const args=process.argv.slice(2);if(args.includes('--version')){console.log('fake pnpm or vitest');process.exit(0)}
if(args[0]==='run' && args[1]==='build'){console.log('fake build succeeded');process.exit(0)}
if(args.includes('vitest') && args.includes('run')){
  if(process.env.GF_MOCK_MODE==='missing') {console.log('mock Vitest passed without records');process.exit(0)}
  const all=args.length<=3;
  const record=(component,id,suite)=>{const r={id,component,suite,item:'fake-observation',input:[1],expected:[1],actual:[1],passed:true,note:'simulated; NOT a real algebra test'};appendFileSync(process.env.GF_TEST_RECORDS,JSON.stringify(r)+'\\n')}
  const groups={'prime-field':'prime-field','polynomial':'polynomial','polynomial-division':'polynomial','euclidean':'algorithms','irreducible':'algorithms','extension-field':'finite-field','field-element':'finite-field','trace':'trace','properties':'finite-field','integration':'finite-field'};
  for(const [suite,group] of Object.entries(groups)){
    if(all || args.some(x=>x.endsWith(suite+'.test.ts'))){
      const id=({ 'prime-field':'PF-ADD-001','polynomial':'POLY-MUL-001','polynomial-division':'POLY-DIV-001','euclidean':'EUCLID-001','irreducible':'IRR-001','extension-field':'FIELD-MUL-001','field-element':'FIELD-ELEM-001','trace':'TRACE-001','properties':'PROP-001','integration':'INTEG-001' })[suite];
      record(group,id,suite+'.test.ts');
    }
  }
  console.log('FAKE tests passed');process.exit(0)
}
console.log('fake pnpm accepted args');
`;
function call(cmd,args,opts={}){return spawnSync(cmd,args,{encoding:'utf8',timeout:60_000,...opts})}
function setup(){
  const dir=mkdtempSync(path.join(tmpdir(),'gf-supervisor-selftest-'));
  const repo=path.join(dir,'galois-field');mkdirSync(repo);
  cpSync(ROOT,repo,{recursive:true,filter:src=>!src.includes('/reports/tests/') && !src.includes('/node_modules/')});
  writeFileSync(path.join(repo,'package.json'),JSON.stringify({name:'mock-galois-test',private:true,scripts:{build:'true'}},null,2));
  writeFileSync(path.join(repo,'.gitignore'),'reports/tests/\n');
  writeFileSync(path.join(repo,'slides.md'),'# existing Slidev content\n');
  writeFileSync(path.join(repo,'README.md'),'# Mock repo — supervisor self-test\n');
  const codex=path.join(dir,'fake-codex.mjs'),pnpm=path.join(dir,'fake-pnpm.mjs');
  writeFileSync(codex,MOCK_CODEX);writeFileSync(pnpm,MOCK_PNPM);chmodSync(codex,0o755);chmodSync(pnpm,0o755);
  for(const cmd of [['init','-q','-b','feature/build-calculator'],['config','user.name','Supervisor Selftest'],['config','user.email','supervisor-test@example.invalid'],['add','.'],['commit','-qm','initial mock']]){
    const r=call('git',cmd,{cwd:repo});if(r.status!==0)throw Error(`git ${cmd}: ${r.stderr}`)
  }
  return {dir,repo,codex,pnpm,logdir:path.join(dir,'hostlogs')};
}
const scenarios=[
  ['normal',0,'COMPLETED'],
  ['exit',3,'FAILED'],
  ['hang',4,'ABORTED'],
  ['unauthorized',4,'ABORTED'],
  ['frozen',4,'ABORTED'],
  ['missing',3,'FAILED'],
  ['wrong-branch',2,'BLOCKED'],
  ['dirty',2,'BLOCKED'],
];
let failures=0;
for(const [mode,code,status] of scenarios){
  const t=setup();
  try{
    if(mode==='wrong-branch'){const r=call('git',['switch','-qc','wrong-branch'],{cwd:t.repo});assert.equal(r.status,0)}
    if(mode==='dirty')writeFileSync(path.join(t.repo,'slides.md'),'uncommitted private slide edits');
    const proc=call(process.execPath,[SELF,'--run','--repo',t.repo],{
      cwd:t.repo,env:{...process.env,GF_CODEX_BIN:t.codex,GF_PNPM_BIN:t.pnpm,GF_RUNLOG_DIR:t.logdir,GF_MOCK_MODE:mode,
        GF_TASK_TIMEOUT_MS:mode==='hang'?'1500':'12000',GF_IDLE_TIMEOUT_MS:mode==='hang'?'900':'12000',GF_TOTAL_TIMEOUT_MS:'55000',GF_POLL_MS:'300',GF_MAX_REPAIRS:'2'},
      timeout:60_000,
    });
    const entries=existsSync(t.logdir)?readdirSync(t.logdir):[];
    assert.equal(entries.length,1,'one external run directory must exist');
    const run=path.join(t.logdir,entries[0]);
    const result=JSON.parse(readFileSync(path.join(run,'run-status.json'),'utf8'));
    assert.equal(proc.status,code,`wrong exit: ${proc.stderr}\n${proc.stdout}\nreason=${result.reason||'none'}\nlogdir=${run}`);
    assert.equal(result.status,status,'wrong state');
    if(status==='COMPLETED') {
      assert.ok(existsSync(path.join(run,'test-summary.json')),'missing test report');
      assert.equal(JSON.parse(readFileSync(path.join(run,'test-summary.json'),'utf8')).passed,true);
    } else {
      assert.ok(existsSync(path.join(run,'failure-report.md')),'missing failure report');
      assert.ok(existsSync(path.join(run,'changes.patch')),'missing diagnostic patch');
    }
    console.log(`PASS supervisor ${mode}: exit=${proc.status}, state=${result.status}`);
  } catch(e){failures++;console.error(`FAIL supervisor ${mode}: ${e.stack}`);}
  finally {if(process.env.GF_SELFTEST_KEEP==='1')console.log('kept',t.dir);else rmSync(t.dir,{recursive:true,force:true});}
}
if(failures){console.error(`${failures} supervisor self-tests failed`);process.exitCode=1;}
else console.log('All supervisor control-flow tests passed. These are MOCK tests, not Codex or GF arithmetic integration tests.');
