import {DynamoDBClient, CreateTableCommand, DescribeTableCommand} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand} from '@aws-sdk/lib-dynamodb';

export function dynamoStore(table = process.env.DYNAMODB_TABLE || 'HomeHunt') {
  const client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb:8000', region:'us-east-1', credentials:{accessKeyId:'local',secretAccessKey:'local'}});
  const doc = DynamoDBDocumentClient.from(client);
  const Key = (member,id) => ({household:'home-hunt', key:`LIKE#${member}#${id}`});
  return {
    async init() {
      for(let attempt=0;attempt<30;attempt++) {
        try {
          try { await client.send(new DescribeTableCommand({TableName:table})); }
          catch(e) {
            if(e.name!=='ResourceNotFoundException')throw e;
            await client.send(new CreateTableCommand({TableName:table,KeySchema:[{AttributeName:'household',KeyType:'HASH'},{AttributeName:'key',KeyType:'RANGE'}],AttributeDefinitions:[{AttributeName:'household',AttributeType:'S'},{AttributeName:'key',AttributeType:'S'}],BillingMode:'PAY_PER_REQUEST'}));
          }
          return;
        } catch(e) { if(attempt===29)throw e; await new Promise(r=>setTimeout(r,2000)); }
      }
    },
    async all() {
      let records=[], cursor;
      do { const r=await doc.send(new QueryCommand({TableName:table,KeyConditionExpression:'household = :h',ExpressionAttributeValues:{':h':'home-hunt'},ConsistentRead:true,ExclusiveStartKey:cursor})); records.push(...r.Items); cursor=r.LastEvaluatedKey; }while(cursor);
      return records.map(({household,key,...record})=>record);
    },
    async get(member,id) { const r=await doc.send(new GetCommand({TableName:table,Key:Key(member,id),ConsistentRead:true})); if(!r.Item)return null; const {household,key,...record}=r.Item; return record; },
    async put(record,baseVersion) {
      try {
        await doc.send(new PutCommand({TableName:table,Item:{...Key(record.member,record.homeId),...record},ConditionExpression:baseVersion===0?'attribute_not_exists(#v)':'#v = :v',ExpressionAttributeNames:{'#v':'version'},...(baseVersion===0?{}:{ExpressionAttributeValues:{':v':baseVersion}})}));
        return true;
      }catch(e){if(e.name==='ConditionalCheckFailedException')return false;throw e;}
    }
  };
}
