import {readFile} from 'node:fs/promises';
import {dynamoStore} from './store.mjs';
import {buildProfile} from '../taste-engine.mjs';
const homes=JSON.parse(await readFile(new URL('./homes.json',import.meta.url),'utf8'));
const records=await dynamoStore().all();
console.log(JSON.stringify({generatedAt:new Date().toISOString(),catalogDate:homes.map(h=>h.refreshedAt).filter(Boolean).sort().at(-1),records,profile:buildProfile(homes,records),likedHomes:homes.filter(h=>records.some(r=>r.homeId===h.id&&r.liked)),dislikedHomes:homes.filter(h=>records.some(r=>r.homeId===h.id&&r.disliked&&!r.liked))},null,2));
