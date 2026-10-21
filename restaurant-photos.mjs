import fs from 'node:fs/promises';
// Curated website previews only. Never replace them with an unreviewed gallery image.
const photos=JSON.parse(await fs.readFile('restaurant-photos.json','utf8'));
for(const [id,p] of Object.entries(photos)){
 p.checkedAt=new Date().toISOString();
 try{
  const r=await fetch(p.url,{method:'HEAD',signal:AbortSignal.timeout(15000)});
  if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Image unavailable: '+r.status);
  p.status='ok';delete p.error;
 }catch(e){p.status='error';p.error=e.message;}
 console.log(id,p.status);
}
await fs.writeFile('restaurant-photos.json',JSON.stringify(photos,null,2));
