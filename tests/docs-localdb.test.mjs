import test from 'node:test';
import assert from 'node:assert/strict';
const memory = new Map();
global.localStorage = {getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:(k)=>memory.delete(k),clear:()=>memory.clear()};
const { LocalDB } = await import('../docs/local-db.js');
test('docs LocalDB flow parity: world/entity/event/export', () => {localStorage.clear();const world=LocalDB.createWorld({name:'Static World',time_start:0,time_end:100});const river=LocalDB.createEntity(world.id,{type:'river',name:'Static River',data:{sourceX:1,sourceY:2,path:[{x:1,y:2}]}});assert.ok(river.id);const dump=LocalDB.exportWorld(world.id);assert.equal(dump.world.id,world.id);});
