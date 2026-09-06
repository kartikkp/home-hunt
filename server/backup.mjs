import {mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import {dynamoStore} from './store.mjs';
const store=dynamoStore();
async function backup(){
  const records=await store.all();const stamp=new Date().toISOString();await mkdir('/backups',{recursive:true});
  await writeFile(`/backups/home-hunt-${stamp.slice(0,10)}.json`,JSON.stringify({schemaVersion:1,savedAt:stamp,records},null,2),{mode:0o600});
  const files=(await readdir('/backups')).filter(f=>/^home-hunt-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for(const name of files.slice(0,-30))await unlink('/backups/'+name);
  console.log('Home Hunt backup saved',stamp,records.length);
}
for(;;){try{await backup();await new Promise(r=>setTimeout(r,86400000));}catch(e){console.error('Backup retry:',e.name);await new Promise(r=>setTimeout(r,60000));}}
