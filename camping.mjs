import fs from 'node:fs/promises';
const base='https://gocamping.or.kr';
export const definition={id:'camping',name:'한국관광공사 고캠핑 · 전국 등록 야영장',url:base+'/bsite/camp/info/list.do',note:'공식 목록·상세 주소·좌표 정기 확인. 등록정보는 실시간 영업·예약·차량 입장 보장이 아닙니다.'};
export const clean=h=>String(h||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function parseList(h){return h.split(/<div class="list-item\s+/).slice(1).map(b=>{const id=b.match(/c_no=(\d+)/)?.[1],title=clean(b.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]).replace(/^\[[^\]]+\]\s*/,''),address=clean(b.match(/class="address[^>]*>([\s\S]*?)<\/a>/)?.[1]);return {id,title,address,registered:/class="register"/.test(b),closed:/^[^"]*hotel_close/.test(b)||/휴업|폐업|영업중단|운영중단/.test(title),url:base+'/bsite/camp/info/read.do?c_no='+id}}).filter(x=>x.id&&x.title);}
export function parseDetail(h,c){
 const section=h.slice(h.indexOf('<!-- 캠프 상세 정보-->'));if(!section)throw Error('상세 구조 변경');
 const fields=Object.fromEntries([...section.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/g)].map(m=>[clean(m[1]),clean(m[2])]));
 const address=fields['주소'],lat=Number(section.match(/var lat\s*=\s*"([\d.]+)"/)?.[1]),lng=Number(section.match(/var lng\s*=\s*"([\d.]+)"/)?.[1]);
 if(!address||address.replace(/\s/g,'')!==c.address.replace(/\s/g,''))throw Error('목록·상세 주소 불일치');
 if(!(lat>=33&&lat<=39&&lng>=124&&lng<=132))throw Error('국내 좌표 확인 실패');
 const extras=fields['기타 정보']||'',restriction=fields['기타 부대시설']||'';
 const website=section.match(/<a[^>]+href="(https?:[^" ]+)"[^>]*>홈페이지 바로가기/)?.[1]||'';
 const rvs=/개인 캠핑카 입장가능/.test(extras)&&!/(캠핑카|차량).{0,15}(금지|불가)/.test(restriction);
 const region=address.split(' ')[0];const seasons=fields['운영기간']||'';
 const months=[...new Set([...(seasons.includes('봄')?[3,4,5]:[]),...(seasons.includes('여름')?[6,7,8]:[]),...(seasons.includes('가을')?[9,10,11]:[]),...(seasons.includes('겨울')?[12,1,2]:[])])];
 const updated=section.match(/최종 정보 수정일\s*:\s*(\d{4}-\d{2}-\d{2})/)?.[1]||'';
 return {id:'gocamping-'+c.id,sourceId:'camping',itemType:'camping',activityKind:'camping',category:'캠핑',title:c.title,url:c.url,region,address,venue:c.title,latitude:lat,longitude:lng,websiteUrl:website,rvAllowed:rvs,trailerAllowed:/개인 트레일러 입장가능/.test(extras),campType:fields['캠핑장 유형']||'등록 야영장',facilities:fields['주요시설']||'',pets:fields['반려동물 출입']||'확인 필요',restriction,operatingMonths:months,hours:fields['운영일']||'운영일 문의',season:seasons,contact:fields['문의처']||'',priceText:'캠핑장 요금 확인',priceNote:'사이트·차종·날짜별 요금은 운영자 안내에서 확인',summary:(fields['캠핑장 유형']||'등록 야영장')+' · '+(rvs?'개인 캠핑카 입장 가능으로 안내된 곳입니다.':'개인 캠핑카 입장 여부는 별도 확인이 필요합니다.'),dateLabel:'운영일·예약 가능 여부 확인',audience:rvs?'개인 캠핑카 입장 가능 표기 · 차종·크기·구역은 운영자 확인':'텐트·차종별 이용 구역은 운영자 확인',conditions:['고캠핑 등록 목록과 상세 주소를 대조했습니다. 현장·영업 상태까지 확인한 것은 아닙니다.','주차 가능은 차박·취사·숙박 허용을 뜻하지 않습니다. 지정 사이트만 이용하세요.',restriction||'차량 높이·길이·트레일러 허용 구역과 전기 사용 조건을 확인하세요.'],registryUpdatedAt:updated,detailCheckedAt:new Date().toISOString(),verification:'registry-address-matched'};
}
async function get(u){const r=await fetch(u,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'EasyPlan public camping directory/1.0'}});if(!r.ok)throw Error('HTTP '+r.status);return r.text()}
if(process.argv.includes('--run')){
 const data=JSON.parse(await fs.readFile('data.json','utf8'));const old=data.sources.find(s=>s.id==='camping');const now=new Date().toISOString();let collected=[],failures=[];
 try{
 const h=await get(definition.url+'?pageUnit=100&pageIndex=1');const total=Number(h.match(/class="count">([\d,]+)/)?.[1]?.replaceAll(',',''));if(!total||total>15000)throw Error('총 개수 확인 실패');
 let listings=parseList(h);for(let n=2;n<=Math.ceil(total/100);n++){listings.push(...parseList(await get(definition.url+'?pageUnit=100&pageIndex='+n)));if(n%10===0)console.log('목록',n,listings.length);}
 listings=[...new Map(listings.map(x=>[x.id,x])).values()];if(listings.length<total*.98)throw Error('전체 목록 불완전');const rejected=listings.filter(x=>x.closed||!x.registered);const targets=listings.filter(x=>!x.closed&&x.registered);let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<targets.length){const c=targets[cursor++];try{collected.push(parseDetail(await get(c.url),c));}catch(e){failures.push({id:c.id,title:c.title,reason:e.message});}if((collected.length+failures.length)%200===0)console.log('상세',collected.length,failures.length);await new Promise(r=>setTimeout(r,120));}}));
 if(!collected.length)throw Error('상세 확인 모두 실패');collected.sort((a,b)=>Number(b.rvAllowed)-Number(a.rvAllowed)||a.region.localeCompare(b.region,'ko')||a.title.localeCompare(b.title,'ko'));
 const value={...definition,status:failures.length?'partial':'ok',lastAttempt:now,lastSuccess:now,items:collected,totalListed:total,excludedCount:rejected.length,failedDetails:failures.length,warnings:failures.length?['상세 재확인 실패 장소는 표시하지 않습니다.']:[]};data.sources=data.sources.filter(s=>s.id!=='camping').concat(value);await fs.writeFile('sources/camping.json',JSON.stringify(value));await fs.writeFile('camping-audit.json',JSON.stringify({checkedAt:now,excluded:rejected,failed:failures},null,2));console.log('완료',JSON.stringify({listed:total,added:collected.length,excluded:rejected.length,failed:failures.length,rv:collected.filter(x=>x.rvAllowed).length}));
 }catch(e){if(!old)throw e;const value={...old,status:'error',lastAttempt:now,error:'캠핑 재확인 실패 · 이전 장소 추천 중단',items:[]};data.sources=data.sources.filter(s=>s.id!=='camping').concat(value);await fs.writeFile('sources/camping.json',JSON.stringify(value));console.log(e.message);}
 await fs.writeFile('data.json',JSON.stringify(data));
}
