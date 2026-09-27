import {test} from 'node:test';
import assert from 'node:assert/strict';
import {swipeDecision,swipeThreshold} from '../src/swipe';
test('horizontal swipes choose the intended direction on narrow and wide screens',()=>{
  for(const width of [320,390,768]){
    const threshold=swipeThreshold(width);
    assert.equal(swipeDecision(threshold,10,0,width),'like');
    assert.equal(swipeDecision(-threshold,10,0,width),'pass');
    assert.equal(swipeDecision(threshold-1,0,0,width),null);
  }
});
test('vertical scrolling and small movements never dismiss a card',()=>{
  assert.equal(swipeDecision(30,140,1,390),null);
  assert.equal(swipeDecision(20,0,2,390),null);
  assert.equal(swipeDecision(100,150,1,390),null);
});
test('a deliberate flick works but reversing direction below the threshold snaps back',()=>{
  assert.equal(swipeDecision(55,8,0.8,390),'like');
  assert.equal(swipeDecision(-55,8,-0.8,390),'pass');
  assert.equal(swipeDecision(55,8,-0.8,390),null);
});
