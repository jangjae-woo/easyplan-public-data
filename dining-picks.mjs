import fs from 'node:fs/promises';
// Link health does not verify taste, operation, or menu prices. Editorial dates stay unchanged.
const data=JSON.parse(await fs.readFile('data.json','utf8'));
const source=data.sources.find(s=>s.id==='dining-picks');
if(source){
 const now=new Date().toISOString();let cursor=0;
 await Promise.all(Array.from({length:2},async()=>{while(cursor<source.items.length){const p=source.items[cursor++];
  if(p.linksCheckedAt&&Date.now()-Date.parse(p.linksCheckedAt)<7*86400000)continue;
  for(const e of p.evidence){try{const r=await fetch(e.url,{signal:AbortSignal.timeout(10000)});const body=await r.text();e.linkStatus=r.ok&&body.length>500&&!/captcha|access denied|verify you are human/i.test(body)?'reachable':'unavailable';}catch{e.linkStatus='unavailable';}}
  p.linksCheckedAt=now;p.linkHealth=p.evidence.every(e=>e.linkStatus==='reachable')?'ok':'partial';
 }}));
 source.catalogUpdatedAt=now;source.lastAttempt=now;
 await fs.writeFile('sources/dining-picks.json',JSON.stringify(source));await fs.writeFile('data.json',JSON.stringify(data));
 console.log('Dining picks: link health checked; price and review dates unchanged');
}
