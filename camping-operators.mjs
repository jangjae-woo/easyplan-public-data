import fs from 'node:fs/promises';
// Operator-specific facts are added only after the current page still contains their evidence.
const data=JSON.parse(await fs.readFile('data.json','utf8'));
const source=data.sources.find(x=>x.id==='camping');
const read=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return (await r.text()).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');};
for(const p of source?.items||[]){
 if(p.address.startsWith('전남광주통합특별시'))p.region=/^전남광주통합특별시 (동구|서구|남구|북구|광산구)(?:\s|$)/.test(p.address)?'광주':'전남';
 if(!['gocamping-1698','gocamping-2703'].includes(p.id))continue;
 delete p.operatorEvidence;
 try{
  if(p.id==='gocamping-1698'){
   const url='https://www.sjfmc.or.kr/camping/sub01_02.do',t=await read(url);
   if(!t.includes('합강캠핑장')||!t.includes('캠핑카존'))throw Error('운영자 페이지 변경');
   p.websiteUrl='https://www.sjfmc.or.kr/camping.do';
   p.operatorEvidence={url,note:'합강캠핑장 운영기관의 캠핑카존 안내를 추가 대조했습니다. 지정 구역별 차량 조건을 확인하세요.',checkedAt:new Date().toISOString().slice(0,10)};
   if(t.includes('사이트 당 캠핑카')&&t.includes('1대만 가능')){p.rvAllowed=true;p.summary='운영기관이 캠핑카존을 안내하는 등록 야영장입니다.';p.restriction='사이트당 캠핑카 1대. 프리캠핑존·바비큐존은 사이트 내 차량 주차 불가.';}
   if(/캠핑카존.{0,90}45,000.{0,20}40,000.{0,70}40,000.{0,20}35,000/.test(t)){
    p.priceText='캠핑카존 35,000~45,000원';p.priceNote='1박 2일 · 평일/휴일·사이트 크기별. 전기 1일 3,000원 및 추가 인원 등 별도. 공식 요금표 기준, 예약 가능 가격 아님.';
   }
  }else{
   const url='https://www.jeongeup.go.kr/reserve/index.jeongeup?menuCd=DOM_000001207001004000',t=await read(url);
   if(!t.includes('국민여가캠핑장')||!t.includes('내장산로 410')||!p.address.includes('내장산로 410'))throw Error('운영자 주소 불일치');
   p.websiteUrl='https://www.jeongeup.go.kr/reserve/index.jeongeup?menuCd=DOM_000001207001003000';
   p.operatorEvidence={url,note:'정읍시 운영 안내와 도로명주소(내장산로 410), 지번(부전동 1004-1)을 추가 대조했습니다.',checkedAt:new Date().toISOString().slice(0,10)};
   p.communityRefs=[{url:'https://goodlifehappy.tistory.com/92',label:'2021년 개인 블로그 소개 · 현재 요금·규정과 다를 수 있음'}];
  }
  console.log('운영자 추가 대조',p.title,p.priceText);
 }catch(e){console.log('추가 대조 제외',p.title,e.message);}
}
if(source){await fs.writeFile('sources/camping.json',JSON.stringify(source));await fs.writeFile('data.json',JSON.stringify(data));}
