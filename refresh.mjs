import fs from 'node:fs/promises';
export function merge(old,fresh,now){
 if(!fresh||fresh.id!==old.id||!Array.isArray(fresh.items)||!['ok','partial'].includes(fresh.status))return {...old,status:'error',lastAttempt:now,error:'자동 수집 실패 · 마지막 성공 자료 유지'};
 return {...fresh,error:fresh.status==='partial'?'일부 출처 확인 실패':null,warnings:fresh.warnings?.length?['일부 상세 확인 실패']:[]};
}
if(process.argv.includes('--test')){
 const {default:assert}=await import('node:assert/strict');const old={id:'x',items:[{id:'a'}],lastSuccess:'old'};
 assert.deepEqual(merge(old,{id:'x',status:'error',items:[]},'now').items,old.items);assert.equal(merge(old,null,'now').lastSuccess,'old');assert.equal(merge(old,{id:'wrong',status:'ok',items:[]},'now').status,'error');assert.equal(merge(old,{id:'x',status:'ok',items:[],lastSuccess:'new'},'now').lastSuccess,'new');console.log('snapshot preservation checks passed');
}else{
 const data=JSON.parse(await fs.readFile('data.json','utf8')),now=new Date().toISOString();let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<data.sources.length){const idx=cursor++,old=data.sources[idx];if(['michelin','camping','creator-dining'].includes(old.id)){console.log('michelin browser snapshot',old.status,old.items?.length);continue;}let fresh;try{const r=await fetch('https://peanut-easyplan.vercel.app/api/benefits?source='+encodeURIComponent(old.id)+'&scheduled='+Date.now(),{signal:AbortSignal.timeout(59000)});if(!r.ok)throw Error();fresh=await r.json();}catch{}const value=merge(old,fresh,now);data.sources[idx]=value;await fs.writeFile('sources/'+old.id+'.json',JSON.stringify(value));console.log(old.id,value.status,value.items?.length||0);}}));
 data.scheduledAt=now;await fs.writeFile('data.json',JSON.stringify(data));const failed=data.sources.filter(s=>s.status==='error');
 await fs.writeFile('status.json',JSON.stringify({checkedAt:now,total:data.sources.length,failed:failed.map(s=>s.id)}));
 if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`## 자동 수집\n${data.sources.length}개 출처 · 실패 ${failed.length}개 (이전 자료 유지)\n${failed.map(s=>'- '+s.name).join('\n')}\n`);
}
