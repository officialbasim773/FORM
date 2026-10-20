import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_URL || 'http://127.0.0.1:5174';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local tests only');
const user='media-'+randomUUID(),other='media-other-'+randomUUID();let checks=0;
async function req(path,{who=user,method='GET',data,status=200,bytes}={}) {const r=await fetch(base+'/api/'+path,{method,headers:{'oai-authenticated-user-id':who,'oai-authenticated-user-email':who+'@example.test','content-type':bytes?'image/png':'application/json'},body:bytes || (data?JSON.stringify(data):undefined)});const out=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(out)}`);checks++;return out;}
const biz={name:'Media tests',phone:'+971500000008',logo:'',accent:'#176650',button:'#176650'};
await req('business',{method:'POST',data:biz,status:201});await req('business',{who:other,method:'POST',data:biz,status:201});
try {
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=','base64');
 const own=await req('upload',{method:'POST',bytes:png}),foreign=await req('upload',{who:other,method:'POST',bytes:png});
 let f=await req('forms',{method:'POST',data:{template:'blank',type:'service',experience:'interactive'},status:201});
 const media={src:own.url,alt:'A sample arrangement',fit:'contain',layout:'side'};
 const draft={...f.draft,interactive:{welcome:true,progress:true,keyboard:true,startLabel:'Start',media},questions:[{id:'style',label:'Choose a style',type:'single choice',required:true,options:['Garden','Sunshine'],media,optionImages:{Garden:own.url,Sunshine:own.url}}]};
 for(const bad of [
  {...draft,interactive:{...draft.interactive,media:{...media,src:foreign.url}}},
  {...draft,questions:[{...draft.questions[0],media:{...media,src:foreign.url}}]},
  {...draft,questions:[{...draft.questions[0],optionImages:{Garden:foreign.url}}]},
  {...draft,questions:[{...draft.questions[0],media:{...media,src:'https://example.com/image.png'}}]}
 ])await req(`forms/${f.id}`,{method:'PATCH',data:{draft:bad,revision:f.revision},status:400});
 f=await req(`forms/${f.id}`,{method:'PATCH',data:{draft,revision:f.revision}});
 f=await req(`forms/${f.id}/publish`,{method:'POST',data:{revision:f.revision}});
 const pub=await req(`public/${f.slug}`);assert.deepEqual(pub.form.questions[0].media,media);assert.equal(pub.form.interactive.media.src,own.url);
 const r=await req(`public/${f.slug}/submit`,{method:'POST',status:201,data:{version:f.version,visitor:randomUUID(),idempotency:randomUUID(),token:randomUUID(),startedAt:Date.now()-5000,selections:[],answers:{style:'Sunshine'}}});assert.equal(r.answers[0].value,'Sunshine');
 const responses=await req('responses');assert.equal(responses.responses[0].snapshot.questions[0].optionImages.Sunshine,own.url);
 const image=await fetch(base+own.url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
 console.log(`PASS ${checks} media API assertions, image retrieval, picture answer values and ownership isolation.`);
} finally {await req('business',{method:'DELETE'});await req('business',{who:other,method:'DELETE'});}
