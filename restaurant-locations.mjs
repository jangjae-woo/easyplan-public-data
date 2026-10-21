import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
export function normalize(raw,item){
 const flatten=x=>Array.isArray(x)?x.flatMap(flatten):x&&typeof x==='object'?[x,...flatten(x['@graph']||[])]:[];
 const nodes=raw.json.flatMap(s=>{try{return flatten(JSON.parse(s))}catch{return []}});
 const node=nodes.find(x=>[].concat(x['@type']).includes('Restaurant')&&x.url?.split('/').at(-1)===item.url.split('/').at(-1));
 if(!node?.address?.streetAddress)throw Error('Restaurant address missing');
 const lat=Number(node.latitude??node.geo?.latitude),lng=Number(node.longitude??node.geo?.longitude);
 if(!(lat>33&&lat<39&&lng>124&&lng<132))throw Error('Invalid Korea coordinates');
 const city=item.region==='서울'?'서울특별시':'부산광역시';
 const street=node.address.streetAddress.trim();
 const website=raw.links.find(x=>/웹사이트 방문|Visit website/i.test(x.text)&&/^https?:\/\//.test(x.url)&&!new URL(x.url).hostname.endsWith('michelin.com'))?.url||'';
 return {address:/^(서울|부산)/.test(street)?street:city+' '+street,postalCode:node.address.postalCode||'',telephone:node.telephone||'',latitude:lat,longitude:lng,websiteUrl:website,sourceUrl:item.url,checkedAt:new Date().toISOString(),status:'ok'};
}
if(process.argv.includes('--run')){
 const {chromium}=await import('playwright');const data=JSON.parse(await fs.readFile('data.json','utf8'));
 const items=data.sources.find(s=>s.id==='michelin').items;let result={};try{result=JSON.parse(await fs.readFile('restaurant-locations.json','utf8'))}catch{}
 const browser=await chromium.launch();let next=0,ok=0,failed=0;
 try{await Promise.all([0,1,2].map(async()=>{const page=await browser.newPage();while(next<items.length){const item=items[next++];if(process.argv.includes('--missing')&&result[item.id]?.status==='ok')continue;
 try{await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:45000});await page.locator('script[type="application/ld+json"]').first().waitFor({state:'attached',timeout:10000});
 const raw=await page.evaluate(()=>({json:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>x.textContent),links:[...document.querySelectorAll('a')].filter(x=>/웹사이트 방문|Visit website/i.test(x.textContent)).map(x=>({text:x.textContent,url:x.href}))}));
 result[item.id]=normalize(raw,item);ok++;
 }catch(e){console.log('location error',item.id,e.message.split('\n')[0]);result[item.id]={...result[item.id],status:'error',lastAttempt:new Date().toISOString(),error:'상세 위치 갱신 실패 · 이전 확인 자료 유지'};failed++;}
 if((ok+failed)%20===0){await fs.writeFile('restaurant-locations.json',JSON.stringify(result));console.log('locations',ok,failed);}
 }await page.close();}));}finally{await browser.close();await fs.writeFile('restaurant-locations.json',JSON.stringify(result));}
 console.log(JSON.stringify({total:items.length,ok,failed,addresses:Object.values(result).filter(x=>x.address).length,websites:Object.values(result).filter(x=>x.websiteUrl).length}));
}
if(process.argv.includes('--test')){
 const item={url:'https://guide.michelin.com/kr/ko/restaurant/test',region:'서울'};const node={'@type':'Restaurant',url:item.url,address:{streetAddress:'강남구 도산대로 67길 19, 2층'},latitude:37.5,longitude:127};
 const raw={json:[JSON.stringify({'@graph':[node]})],links:[{text:'웹사이트 방문',url:'https://example.com'}]};
 assert.equal(normalize(raw,item).address,'서울특별시 강남구 도산대로 67길 19, 2층');assert.equal(normalize(raw,item).websiteUrl,'https://example.com');
 assert.throws(()=>normalize(raw,{...item,url:item.url+'wrong'}));assert.throws(()=>normalize({...raw,json:[JSON.stringify({...node,latitude:0})]},item));
 assert.equal(normalize({...raw,links:[{text:'웹사이트 방문',url:'javascript:alert(1)'}]},item).websiteUrl,'');console.log('Location checks passed');
}
