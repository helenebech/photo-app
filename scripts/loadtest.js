import fetch from 'node-fetch';

const [,, token, imageId, parallel='8', seconds='300'] = process.argv;
const URL = `http://localhost:3000/api/v1/images/${imageId}/process`;
const until = Date.now() + Number(seconds)*1000;

async function fire(){
const r = await fetch(URL, { method:'POST', headers: { Authorization: 'Bearer '+token }});
if (!r.ok) throw new Error('Req failed');
}

async function worker(){
while (Date.now() < until) { try { await fire(); } catch {} }
}

await Promise.all(Array.from({length:Number(parallel)}, worker));
console.log('done');