const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),ts=require('typescript');
const repo=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'factory-cost-'));
const requireRoot=require;
function load(file,stubs={}){const code=ts.transpileModule(fs.readFileSync(path.join(repo,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',code)(name=>stubs[name]??requireRoot(name),module,module.exports);return module.exports;}
const workspace=load('src/trigger/lib/workspace.ts',{'@/factory/config':{REPO:{appsDir:'apps',templateDir:'templates/starter'}},'./shell':{sh:async()=>{throw Error('Provider/git operation unexpected in local scaffold test');}}});
(async()=>{
 fs.cpSync(path.join(repo,'templates'),path.join(tmp,'templates'),{recursive:true});fs.mkdirSync(path.join(tmp,'scripts'));fs.copyFileSync(path.join(repo,'scripts/check-cloud-cost.cjs'),path.join(tmp,'scripts/check-cloud-cost.cjs'));fs.copyFileSync(path.join(repo,'CLOUD_COST_DEFAULTS.md'),path.join(tmp,'CLOUD_COST_DEFAULTS.md'));
 const app=workspace.scaffoldApp(tmp,'efficient-film','Efficient Film');
 fs.symlinkSync(path.join(repo,'node_modules'),path.join(app,'node_modules'),'dir');
 assert.equal(JSON.parse(fs.readFileSync(path.join(app,'package.json'),'utf8')).name,'efficient-film');assert(fs.readFileSync(path.join(app,'AGENTS.md'),'utf8').includes('Cloud cost requirements'));assert(fs.readFileSync(path.join(app,'.vercelignore'),'utf8').includes('graphify-out/'));
 const check=()=>cp.spawnSync(process.execPath,[path.join(app,'scripts/check-cloud-cost.cjs')],{cwd:app,encoding:'utf8'});
 assert.equal(check().status,0);
 fs.mkdirSync(path.join(app,'convex'));const source=path.join(app,'convex/cost.ts');
 const sourceText='export const all=query({handler:async(ctx)=>ctx.db.query("jobs").collect()});';fs.writeFileSync(source,sourceText);assert.equal(check().status,1,'unsafe generated query is rejected');
 let exported=false;
 const gates=load('src/trigger/lib/gates.ts',{'./shell':{sh:async(command,args,opts)=>{const r=cp.spawnSync(command,args,{cwd:opts.cwd,encoding:'utf8'});return {code:r.status,stdout:r.stdout,stderr:r.stderr};},npx:async(args)=>{if(args[0]==='expo')exported=true;return {code:0,stdout:'',stderr:''};}}});
 const result=await gates.runGates(app);assert.equal(result.ok,false);assert(result.issues.some(i=>i.fingerprint==='gate:cloud-cost'&&i.severity==='P0'));assert.equal(exported,false,'actual factory gate prevents export after guard failure');
 fs.writeFileSync(source,'export const recent=query({handler:async(ctx)=>ctx.db.query("jobs").withIndex("by_date",q=>q.gte("date","2026-10-01")).collect()});');assert.equal(check().status,0);
 fs.writeFileSync(source,'export const small=query({\n// @cloud-cost allow-full-scan: eight account rows at most, once per poll\nhandler:async(ctx)=>ctx.db.query("accounts").collect()});');assert.equal(check().status,0);
 fs.writeFileSync(path.join(app,'vercel.json'),JSON.stringify({crons:[{path:'/poll',schedule:'* * * * *'}]}));assert.equal(check().status,1);
 const imported=path.join(tmp,'apps/imported');fs.mkdirSync(imported,{recursive:true});fs.writeFileSync(path.join(imported,'package.json'),JSON.stringify({scripts:{'check:cloud-cost':'node upstream-check.cjs'}}));fs.writeFileSync(path.join(imported,'AGENTS.md'),'Upstream guidance retained');workspace.installCloudCostDefaults(tmp,imported);workspace.installCloudCostDefaults(tmp,imported);
 assert.equal(JSON.parse(fs.readFileSync(path.join(imported,'package.json'),'utf8')).scripts['check:cloud-cost'],'node scripts/check-cloud-cost.cjs && node upstream-check.cjs');assert(fs.readFileSync(path.join(imported,'AGENTS.md'),'utf8').startsWith('Upstream guidance retained'));
 console.log('PASS actual scaffolding, portable checker, registered-query/range/exception/cron cases, blocking factory export gate, imported validation preservation and idempotent installation.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
