// Descarga las imágenes de productos y blog desde el CDN de Shopify a public/img (para no depender de Shopify).
import fs from 'fs';
import path from 'path';
const products = JSON.parse(fs.readFileSync('data/raw_products.json','utf8'));
const blogs = JSON.parse(fs.readFileSync('data/raw_blogs.json','utf8'));
const MAX_IMAGES = 12, WIDTH = 1000;
const jobs = [];
function localName(url){ const u=new URL(url); const base=path.basename(u.pathname).replace(/\.(jpg|jpeg|png|webp|gif)$/i,''); return base.replace(/[^a-zA-Z0-9_-]/g,'_').toLowerCase(); }
const map = { products:{}, blog:{} };
for (const p of products){
  const imgs = p.images.edges.map(e=>e.node).slice(0, MAX_IMAGES);
  map.products[p.handle] = [];
  imgs.forEach((im,i)=>{ const name = `${p.handle}-${i+1}.webp`; map.products[p.handle].push({file:`/img/products/${name}`, alt: im.altText||'', w: im.width, h: im.height});
    jobs.push({url: im.url + (im.url.includes('?')?'&':'?') + `width=${WIDTH}&format=webp`, out:`public/img/products/${name}`}); });
}
for (const b of blogs.blogs.edges) for (const a of b.node.articles.edges){ const n=a.node; if(!n.image) continue; const name=`${n.handle}.webp`; map.blog[n.handle]=`/img/blog/${name}`; jobs.push({url:n.image.url+(n.image.url.includes('?')?'&':'?')+`width=1200&format=webp`, out:`public/img/blog/${name}`}); }
fs.mkdirSync('public/img/products',{recursive:true}); fs.mkdirSync('public/img/blog',{recursive:true});
fs.writeFileSync('data/image-map.json', JSON.stringify(map,null,1));
let done=0, fail=0;
async function worker(){ while(jobs.length){ const j=jobs.shift(); if (fs.existsSync(j.out) && fs.statSync(j.out).size>1000){done++;continue;} try{ const r=await fetch(j.url,{headers:{'User-Agent':'Mozilla/5.0'}}); if(!r.ok) throw new Error(r.status); const b=Buffer.from(await r.arrayBuffer()); fs.writeFileSync(j.out,b); done++; }catch(e){ fail++; console.error('FAIL',j.url,e.message);} if((done+fail)%50===0) console.log(done+fail,'listo'); } }
await Promise.all(Array.from({length:8},worker));
console.log('Descargadas:',done,'Fallidas:',fail);
