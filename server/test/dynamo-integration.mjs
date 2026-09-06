import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DynamoDBClient,DeleteTableCommand} from '@aws-sdk/client-dynamodb';
import {dynamoStore} from '../store.mjs';
const table='HomeHuntTest_'+randomUUID().replaceAll('-','');
const store=dynamoStore(table);await store.init();
try{
  const r={member:'Kartik',homeId:'c01',liked:true,reasons:['Layout'],note:'DISPOSABLE TEST',version:1,operationId:randomUUID(),updatedAt:new Date().toISOString()};
  assert.equal(await store.put(r,0),true);
  assert.equal(await store.put({...r,liked:false},0),false);
  assert.equal((await dynamoStore(table).get('Kartik','c01')).liked,true,'A fresh client reads committed data');
  const results=await Promise.all([store.put({...r,version:2,note:'First edit'},1),store.put({...r,version:2,note:'Second edit'},1)]);
  assert.equal(results.filter(Boolean).length,1,'Exactly one concurrent update wins');
  assert.equal((await store.all()).length,1);
  console.log('PASS: DynamoDB persistent reads and concurrent version checks.');
}finally{
  const client=new DynamoDBClient({endpoint:process.env.DYNAMODB_ENDPOINT,region:'us-east-1',credentials:{accessKeyId:'local',secretAccessKey:'local'}});
  await client.send(new DeleteTableCommand({TableName:table}));
  console.log('Removed disposable test table; HomeHunt data untouched.');
}
