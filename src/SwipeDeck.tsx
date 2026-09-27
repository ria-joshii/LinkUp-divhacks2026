import React,{type ReactNode,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {AppButton} from './ui';
import {COLORS,styles} from './theme';
import {swipeDecision,swipeThreshold,type SwipeDecision} from './swipe';

type Props={children:ReactNode;personName:string;nextName?:string;disabled:boolean;onSwipe:(decision:SwipeDecision)=>Promise<boolean>;onDragChange:(dragging:boolean)=>void};
export function SwipeDeck({children,personName,nextName,disabled,onSwipe,onDragChange}:Props){
  const {width}=useWindowDimensions();
  const position=useRef(new Animated.ValueXY()).current;
  const locked=useRef(false),mounted=useRef(true);
  const [submitting,setSubmitting]=useState(false);
  const latest=useRef({width,disabled,onSwipe,onDragChange});
  latest.current={width,disabled,onSwipe,onDragChange};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;position.stopAnimation();latest.current.onDragChange(false);};},[position]);
  const actions=useMemo(()=>{
    const reset=()=>{
      latest.current.onDragChange(false);
      Animated.spring(position,{toValue:{x:0,y:0},friction:7,tension:60,useNativeDriver:true}).start(()=>{
        locked.current=false;if(mounted.current)setSubmitting(false);
      });
    };
    const commit=(decision:SwipeDecision)=>{
      if(locked.current||latest.current.disabled)return;
      locked.current=true;setSubmitting(true);latest.current.onDragChange(true);
      Animated.timing(position,{toValue:{x:(decision==='like'?1:-1)*(latest.current.width+100),y:12},duration:220,useNativeDriver:true}).start(({finished})=>{
        if(!finished||!mounted.current)return;
        void (async()=>{
          try{
            const saved=await latest.current.onSwipe(decision);
            // Keep the old card offscreen until the updated profile replaces it.
            if(!saved&&mounted.current)reset();
          }catch{if(mounted.current)reset();}
          finally{latest.current.onDragChange(false);}
        })();
      });
    };
    const responder=PanResponder.create({
      onMoveShouldSetPanResponder:(_,g)=>!locked.current&&!latest.current.disabled&&Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.4,
      onPanResponderGrant:()=>{position.stopAnimation();latest.current.onDragChange(true);},
      onPanResponderMove:(_,g)=>{if(!locked.current)position.setValue({x:g.dx,y:Math.max(-20,Math.min(20,g.dy*0.15))});},
      onPanResponderRelease:(_,g)=>{
        const decision=swipeDecision(g.dx,g.dy,g.vx,latest.current.width);
        if(decision&&!latest.current.disabled)commit(decision);else reset();
      },
      onPanResponderTerminationRequest:()=>!locked.current,
      onPanResponderTerminate:reset,
    });
    return {commit,responder};
  },[position]);
  const threshold=swipeThreshold(width);
  const rotation=position.x.interpolate({inputRange:[-width,0,width],outputRange:['-12deg','0deg','12deg'],extrapolate:'clamp'});
  const likeOpacity=position.x.interpolate({inputRange:[0,threshold*0.65],outputRange:[0,1],extrapolate:'clamp'});
  const passOpacity=position.x.interpolate({inputRange:[-threshold*0.65,0],outputRange:[1,0],extrapolate:'clamp'});
  return <View>
    <View style={local.hints}><Text style={local.hint}>← PASS</Text><Text style={local.hint}>DRAG THE CARD</Text><Text style={local.hint}>LINK UP →</Text></View>
    <View style={local.deck}>
      {nextName&&<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={local.nextCard}><Text style={local.nextText}>UP NEXT · {nextName.toUpperCase()}</Text></View>}
      <Animated.View {...actions.responder.panHandlers} accessibilityLabel={`Profile of ${personName}. Swipe right to connect or left to pass. You can also use the buttons below.`} style={{transform:[...position.getTranslateTransform(),{rotate:rotation}]}}>
        {children}
        <Animated.View pointerEvents="none" style={[local.badge,local.like,{opacity:likeOpacity}]}><Ionicons name="heart" size={22} color={COLORS.cobalt}/><Text style={[local.badgeText,{color:COLORS.cobalt}]}>LINK UP</Text></Animated.View>
        <Animated.View pointerEvents="none" style={[local.badge,local.pass,{opacity:passOpacity}]}><Ionicons name="close" size={22} color="#A3351B"/><Text style={[local.badgeText,{color:'#A3351B'}]}>PASS</Text></Animated.View>
      </Animated.View>
    </View>
    <View style={styles.swipeActions}><View style={{flex:0.85}}><AppButton disabled={disabled||submitting} variant="secondary" onPress={()=>actions.commit('pass')} icon={<Ionicons name="close" size={20}/>}>Pass</AppButton></View><View style={{flex:1.15}}><AppButton disabled={disabled||submitting} onPress={()=>actions.commit('like')} icon={<Ionicons name="heart-outline" size={20} color="white"/>}>Link up</AppButton></View></View>
    <Text accessibilityLiveRegion="polite" style={styles.finePrint}>{submitting?'Saving your choice…':'Swipe right to connect. Left to pass. A match takes two yeses.'}</Text>
  </View>;
}
const local=StyleSheet.create({
  hints:{flexDirection:'row',justifyContent:'space-between',marginBottom:12},
  hint:{fontSize:10,fontWeight:'800',letterSpacing:0.8,color:COLORS.muted},
  deck:{paddingBottom:18},
  nextCard:{position:'absolute',top:14,left:10,right:10,bottom:0,backgroundColor:COLORS.lavender,borderWidth:2,borderColor:COLORS.ink,borderRadius:22,justifyContent:'flex-end',alignItems:'center',paddingBottom:2},
  nextText:{fontSize:9,fontWeight:'800',letterSpacing:1,color:COLORS.cobalt},
  badge:{position:'absolute',top:28,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:15,paddingVertical:10,borderRadius:12,borderWidth:3},
  like:{left:18,backgroundColor:COLORS.sage,borderColor:COLORS.cobalt,transform:[{rotate:'-12deg'}]},
  pass:{right:18,backgroundColor:'#FDE5DF',borderColor:'#A3351B',transform:[{rotate:'12deg'}]},
  badgeText:{fontSize:21,fontWeight:'900',letterSpacing:1},
});
