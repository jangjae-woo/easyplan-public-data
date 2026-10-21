import fs from 'node:fs/promises';
const url='https://www.fourseasons.com/seoul/dining/menus/yu-yuan-a-la-carte/';
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
export function parse(h){const groups=[];for(const b of h.split('<div class="Menu-section">').slice(1)){const title=clean(b.match(/Heading-title[^>]*>([\s\S]*?)<\/h2>/)?.[1]||''),note=clean(b.match(/class="Menu-section-(?:options|price)[^>]*>([\s\S]*?)<\/p>/)?.[1]||'');const items=[...b.matchAll(/<dl class="Menu-item">([\s\S]*?)<\/dl>/g)].map(m=>{const en=clean(m[1].match(/<dt[^>]*>([\s\S]*?)<\/dt>/)?.[1]||''),dd=[...m[1].matchAll(/<dd class="Menu-item-details[^>]*>([\s\S]*?)<\/dd>/g)].map(x=>clean(x[1]));return {name:dd.find(t=>/[가-힣]/.test(t))||en,originalName:en,price:dd.filter(t=>/KRW/.test(t)).join(' / ')||( /Market price|싯가/.test(note)?'싯가 · 식당 확인':'가격 원문 확인')};});if(items.length)groups.push({title,note,items});}if(!groups.length)throw Error('menu format changed');return groups;}
// Each adapter reads the current official page. Failed adapters retain dated last-good data.
export const sources=[
{id:'yu-yuan',url,kind:'four',note:'단품 메뉴 · 부가세 10% 포함. 딤섬·청판은 점심 제공. 금액·구성은 방문 전 재확인하세요.'},
{id:'kwonsooksoo',url:'http://www.kwonsooksoo.com/menu.asp',kind:'kwon',note:'코스별 금액. 추가 요리·변경 비용 별도. 미식상은 19시 이후 주문 불가.'},
{id:'jungsik511965',url:'https://www.jungsik.kr/eat/',kind:'jungsik',note:'1인 1코스 필수. 추가 요리·페어링 별도. 채식 코스는 예약 시 선주문.'},
{id:'evett',url:'https://www.restaurantevett.com/menu',kind:'evett',note:'런치 금·토요일 / 디너 화~토요일. 주류·페어링 별도. 계절에 따라 구성 변경.'},
{id:'restaurant-allen',url:'https://restaurantallen.com/menu',kind:'allen',note:'런치·디너 각각 단일 테이스팅 코스. 페어링 별도. 계절별 구성 변경.'},
{id:'solbam',url:'https://www.restaurantsolbam.com/menu',kind:'solbam',note:'공식 공개 코스 구성입니다. 개별 요리 판매가가 아니며 코스 금액은 식당에서 확인하세요.'},
{id:'gucci-osteria-da-massimo-bottura-1203402',url:'https://www.gucciosteria.com/en/seoul/menu/a-la-carte/',kind:'gucci',note:'단품 메뉴 이름을 확인했습니다. 공식 페이지의 숫자에 통화·단위가 없어 원화 금액으로 환산하지 않았습니다.'},
{id:'myeongdong-kyoja',url:'http://www.mdkj.co.kr/menu/all_menu.php',kind:'md',note:'공식 메뉴 안내. 현재 판매 가격은 공식 페이지에서 확인되지 않았습니다.'},
{id:'eatanic-garden',url:'https://jpg.josunhotel.com/dining/eatanicgarden.do',kind:'pdfLinks',note:'공식 페이지에서 제공하는 런치·디너 메뉴 파일을 연결합니다. 금액은 원문 확인.'},
{id:'la-yeon',url:'https://www.shillahotels.com/ko/theshilla/seoul/dining/restaurant/layeon.do',kind:'linksOnly',note:'공식 페이지의 런치 메뉴·디너 메뉴 버튼에서 메뉴판을 확인하세요.'},
{id:'legume',url:'https://legume.kr',kind:'driveLinks',note:'식당 공식 홈페이지가 제공하는 메뉴 파일입니다. 금액·계절 구성은 원문 확인.'},
{id:'soigne',url:'http://soignerestaurantgroup.com/wp/soigneseoul',kind:'linksOnly',note:'공식 식당 안내를 연결했습니다. 코스 금액은 아직 확인되지 않았습니다.'},
{id:'doughroom',url:'http://soignerestaurantgroup.com/wp/doughroom',kind:'linksOnly',note:'서래점 공식 안내입니다. Reservation & Menu에서 식당이 안내하는 예약·메뉴를 확인하세요.'}
];
export const plain=h=>clean(h.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'')).replace(/&(?:nbsp|amp);/g,' ').replace(/[\u200b-\u200d]/g,'');
const group=items=>[{title:'공식 메뉴',items}];
const money=n=>`${Number(n.replace(/[,\s]/g,'')).toLocaleString('en-US')}원`;
function requireRows(items){if(!items.length)throw Error('공식 메뉴 구조 변경');return group(items)}
export function extract(s,h){
 const t=plain(h);let items=[],menuLinks=[];
 if(s.kind==='four')return {groups:parse(h)};
 if(s.kind==='kwon')items=[...h.matchAll(/<h5[^>]*>([^<]+)\/\s*KRW\s*([\d,]+)<\/h5>/g)].map(m=>({name:clean(m[1]),price:money(m[2])}));
 if(s.kind==='jungsik'){
  const blocks=h.split(/id="elementor-tab-2d9ae37-\d"/).slice(1);
  for(let i=0;i<2;i++){const b=plain(blocks[i]||'');const m=b.match(/\bkrw\s+([\d,]+)\s+1인/i);if(!m)throw Error('정식당 코스 가격 확인 실패');items.push({name:i?'시그니처 디너 · 1인':'시그니처 런치 · 1인',price:money(m[1])});}
 }
 if(s.kind==='evett')for(const [en,ko] of [['Lunch','런치'],['Dinner','디너']]){const m=t.match(new RegExp(en+' Tasting Course.{0,100}?(\\d+) Courses ([\\d,]+) KRW'));if(!m)throw Error('에빗 코스 가격 확인 실패');items.push({name:ko+' 테이스팅 · '+m[1]+'코스',price:money(m[2])});}
 if(s.kind==='allen')for(const [en,ko] of [['Lunch','런치'],['Dinner','디너']]){const m=t.match(new RegExp(en+' tasting course ([\\d,]+) KRW'));if(!m)throw Error('알렌 코스 가격 확인 실패');items.push({name:ko+' 테이스팅 코스',price:money(m[1])});}
 if(s.kind==='solbam')items=[...h.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(x=>plain(x[1])).filter(x=>/[가-힣]/.test(x)&&x.includes(',')&&x.length<60).map(name=>({name,price:'코스에 포함 · 금액 미공개'}));
 if(s.kind==='gucci')items=[...h.matchAll(/class="menu-list-item__name"[^>]*>([\s\S]*?)<\/div>/g)].map(x=>({name:plain(x[1]),price:'가격 단위 확인 필요'}));
 if(s.kind==='md')items=[...h.matchAll(/<a[^>]+href="\/menu\/menu0[1-5]\.php"[\s\S]*?<img[^>]+alt="([^"]+)"/g)].map(x=>({name:x[1].trim(),price:'가격 미공개'}));
 if(s.kind==='pdfLinks'){menuLinks=[...h.matchAll(/window.open\('([^']+\.pdf)'\)[^>]*>([^<]+)</g)].map(m=>({label:plain(m[2]),url:new URL(m[1],s.url).href}));if(!menuLinks.length)throw Error('메뉴 파일 연결 확인 실패');}
 if(s.kind==='driveLinks'){menuLinks=[...h.matchAll(/<a[^>]+href="(https:\/\/drive.google.com\/file\/[^" ]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:m[1],label:plain(m[2])})).filter(x=>/Lunch|Dinner|Wine/i.test(x.label));menuLinks=[...new Map(menuLinks.map(x=>[x.url,x])).values()];if(!menuLinks.length)throw Error('메뉴 파일 연결 확인 실패');}
 if(['linksOnly','pdfLinks','driveLinks'].includes(s.kind)){if(t.length<100)throw Error('공식 페이지 응답 없음');return {groups:[],menuLinks};}
 items=items.filter(x=>s.kind!=='md'||(x.name.length<15&&x.name!=='포장'));items=[...new Map(items.map(x=>[x.name,x])).values()];return {groups:requireRows(items)};
}
export async function refresh(){let old={};try{old=JSON.parse(await fs.readFile('restaurant-menus.json','utf8'))}catch{};
 for(const s of sources){const id='michelin-'+s.id,lastAttempt=new Date().toISOString();try{const r=await fetch(s.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const result=extract(s,await r.text());old[id]={...old[id],...result,menuUrl:s.url,websiteUrl:s.url,checkedAt:lastAttempt,lastAttempt,status:'ok',note:s.note};console.log(id,'ok',result.groups.flatMap(g=>g.items).length)}catch(e){old[id]={...old[id],menuUrl:s.url,websiteUrl:s.url,lastAttempt,status:'error',error:e.message};console.log(id,'failed',e.message)}}
 await fs.writeFile('restaurant-menus.json',JSON.stringify(old));return old;
}
if(process.argv.includes('--run'))await refresh();
