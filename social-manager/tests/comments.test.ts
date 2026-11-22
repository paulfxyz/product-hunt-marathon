import {test} from 'node:test';
import assert from 'node:assert/strict';
import {followupComments,withFollowupComment} from '../shared/followup';
test('Manual LinkedIn comment blocks split without changing owner notes',()=>{
 assert.deepEqual(followupComments('Owner notes'),[]);
 const notes=withFollowupComment('Owner notes','First comment.\n\n---\n\nSecond comment.');
 assert.deepEqual(followupComments(notes),['First comment.','Second comment.']);
 assert.ok(withFollowupComment(notes,'Revised').startsWith('Owner notes'));
 assert.deepEqual(followupComments(withFollowupComment(notes,'')),[]);
});
