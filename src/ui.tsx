import React, { type ReactNode, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View, type ImageStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, styles } from './theme';
import { PHOTOS } from '../shared/catalog';
/* Static requires keep the demo portraits available on unreliable Wi-Fi. */
/* eslint-disable @typescript-eslint/no-require-imports */
const portraits=[require('../assets/portraits/0.jpg'),require('../assets/portraits/1.jpg'),require('../assets/portraits/2.jpg'),require('../assets/portraits/3.jpg')];
/* eslint-enable @typescript-eslint/no-require-imports */

export function Wordmark({compact=false}:{compact?:boolean}){return <View style={styles.wordmarkRow}><View style={[styles.wordmarkDot,compact&&styles.wordmarkDotCompact]}/><Text style={[styles.wordmark,compact&&styles.wordmarkCompact]}>LinkUp</Text></View>;}
export function AppButton({children,onPress,variant='primary',icon,disabled=false,busy=false}:{children:ReactNode;onPress:()=>void;variant?:'primary'|'secondary'|'quiet';icon?:ReactNode;disabled?:boolean;busy?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityLabel={typeof children==='string'?children:undefined} disabled={disabled||busy} onPress={onPress} style={({pressed})=>[styles.button,variant==='primary'&&styles.buttonPrimary,variant==='secondary'&&styles.buttonSecondary,variant==='quiet'&&styles.buttonQuiet,pressed&&styles.buttonPressed,(disabled||busy)&&{opacity:0.55}]}><Text style={[styles.buttonText,variant==='secondary'&&{color:COLORS.ink},variant==='quiet'&&styles.buttonQuietText]}>{children}</Text>{busy?<ActivityIndicator color={variant==='primary'?'white':COLORS.ink}/>:icon}</Pressable>;
}
export function Chip({label,selected=false,onPress}:{label:string;selected?:boolean;onPress?:()=>void}){
  const body=<View style={[styles.chip,selected&&styles.chipSelected]}>{selected&&<Ionicons name="checkmark" size={13} color={COLORS.cream}/>}<Text style={[styles.chipText,selected&&styles.chipTextSelected]}>{label}</Text></View>;
  return onPress?<Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress}>{body}</Pressable>:body;
}
export function Eyebrow({children}:{children:ReactNode}){return <Text style={styles.eyebrow}>{children}</Text>;}
export function TextField({label,value,onChangeText,placeholder,phone=false}:{label:string;value:string;onChangeText:(v:string)=>void;placeholder?:string;phone?:boolean}){
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8E7E6E" keyboardType={phone?'phone-pad':'default'} maxLength={phone?24:60} autoComplete={phone?'tel':'off'}/></View>;
}
export function Photo({uri,name,style}:{uri:string;name:string;style:StyleProp<ImageStyle>}){
  const [failed,setFailed]=useState(false);
  return failed?<View style={[style,{backgroundColor:COLORS.lavender,alignItems:'center',justifyContent:'center'}]}><Text style={{fontSize:30,fontWeight:'900',color:COLORS.ink}}>{name.slice(0,2).toUpperCase()}</Text></View>:<Image accessibilityLabel={`${name}'s demo portrait`} source={PHOTOS.includes(uri)?portraits[PHOTOS.indexOf(uri)]:{uri}} onError={()=>setFailed(true)} style={style}/>;
}
export function ErrorNote({message}:{message:string}){return message?<View style={{padding:14,backgroundColor:'#FDE5DF',borderRadius:12,marginVertical:10}}><Text accessibilityRole="alert" style={{color:'#8E2518',lineHeight:20,fontSize:13}}>{message}</Text></View>:null;}
