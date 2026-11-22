import test from 'node:test';
import assert from 'node:assert/strict';
import {assetDelivery} from '../shared/media';
test('GIF previews and downloads retain animation, with a still reduced-motion poster',()=>{
  assert.deepEqual(assetDelivery('motion-pilot/test.gif',false,false),{file:'motion-pilot/test.gif',type:'image/gif'});
  assert.deepEqual(assetDelivery('motion-pilot/test.gif',true,false),{file:'motion-pilot/test.gif',type:'image/gif'});
  assert.deepEqual(assetDelivery('motion-pilot/test.gif',false,true),{file:'motion-pilot/test.png',type:'image/png'});
});
test('existing PNG delivery is unchanged and unsupported formats fail closed',()=>{
  assert.deepEqual(assetDelivery('junk/hero.png',false,false),{file:'junk/hero.webp',type:'image/webp'});
  assert.deepEqual(assetDelivery('junk/hero.png',true,false),{file:'junk/hero.png',type:'image/png'});
  assert.throws(()=>assetDelivery('test.html',false,false));
});
