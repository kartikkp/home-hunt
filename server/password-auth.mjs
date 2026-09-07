import {scrypt,randomBytes,createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),LIFETIME=180*86400;
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(password,salt,32)).toString('hex');}
export function passwordAuth({passwordHash,secret,now=()=>Date.now()}){
  if(!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(passwordHash||''))throw Error('A server-only password hash is required');
  const [salt,hash]=passwordHash.split(':'),expected=Buffer.from(hash,'hex');
  const signingKey=createHash('sha256').update(secret+'\0'+passwordHash).digest();
  const sign=payload=>createHmac('sha256',signingKey).update(payload).digest('base64url');
  const attempts=new Map();let active=0,globalWindow={until:0,count:0};
  function valid(session){
    if(typeof session!=='string'||session.length>512)return false;
    const [payload,sig,extra]=session.split('.');if(extra||!payload||!sig||!/^[A-Za-z0-9_-]{43}$/.test(sig))return false;
    const a=Buffer.from(sig),b=Buffer.from(sign(payload));if(a.length!==b.length||!timingSafeEqual(a,b))return false;
    try{const p=JSON.parse(Buffer.from(payload,'base64url').toString());return p.v===1&&Number.isSafeInteger(p.exp)&&p.exp>Math.floor(now()/1000)&&p.exp<=Math.floor(now()/1000)+LIFETIME&&typeof p.nonce==='string'&&/^[a-f0-9]{24}$/.test(p.nonce);}catch{return false;}
  }
  async function login(password,ip){
    const time=now();for(const [k,v]of attempts)if(v.until<=time)attempts.delete(k);
    const attempt=attempts.get(ip)||{until:time+15*60000,count:0};
    if(globalWindow.until<=time)globalWindow={until:time+60000,count:0};
    if(attempt.count>=10||globalWindow.count>=100||active>=4||attempts.size>=10000&&!attempts.has(ip))return {status:429,error:'Too many login attempts. Please try again later.'};
    attempt.count++;attempts.set(ip,attempt);globalWindow.count++;active++;
    try{
      if(typeof password!=='string'||!password.length||password.length>128)return {status:400,error:'Enter your password.'};
      const candidate=await derive(password,salt,32);
      if(!timingSafeEqual(candidate,expected))return {status:401,error:'Incorrect password. Try again.'};
      attempts.delete(ip);
      const exp=Math.floor(now()/1000)+LIFETIME,payload=Buffer.from(JSON.stringify({v:1,exp,nonce:randomBytes(12).toString('hex')})).toString('base64url');
      return {status:200,session:payload+'.'+sign(payload),expiresAt:new Date(exp*1000).toISOString()};
    }finally{active--;}
  }
  return {login,valid};
}
