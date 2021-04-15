var e=Object.assign;import{r as t,a as n}from"./vendor.6ad4fa42.js";!function(e=".",t="__import__"){try{self[t]=new Function("u","return import(u)")}catch(n){const o=new URL(e,location),r=e=>{URL.revokeObjectURL(e.src),e.remove()};self[t]=e=>new Promise(((n,a)=>{const s=new URL(e,o);if(self[t].moduleMap[s])return n(self[t].moduleMap[s]);const c=new Blob([`import * as m from '${s}';`,`${t}.moduleMap['${s}']=m;`],{type:"text/javascript"}),i=Object.assign(document.createElement("script"),{type:"module",src:URL.createObjectURL(c),onerror(){a(new Error(`Failed to import: ${e}`)),r(i)},onload(){n(self[t].moduleMap[s]),r(i)}});document.head.appendChild(i)})),self[t].moduleMap={}}}("assets/");const o=(e,t)=>({type:"componentList",component:e,connectedVariable:t}),r=t=>t?"type"in t?{type:"input",connectedVar:t}:e(e({},t),{type:"input"}):{type:"input"};function a(e){return"input"===e.type||"button"===e.type||"componentList"===e.type}function s(e,t){const n=e.find((({component:e})=>e===t));if(!n)throw Error(`Unknown component of type ${t.type}. Did you forget to return one in your spec?`);return n.name}function c(e,t,n,o,r,a){if(e.length!==t.length)return!1;for(let s=0;s<e.length;s++){const c=e[s],i=t[s];if(c.type!==i.type)return!1;if("doEffect"===c.type&&"doEffect"===i.type&&c.effect!==i.effect)return!1;if("getEffect"===c.type&&"getEffect"===i.type&&c.result.effect!==i.result.effect)return!1;if("equals"===c.type&&"equals"===i.type)if("variableList"===c.variable.type&&"variableList"===i.variable.type&&void 0!==c.behaviour&&void 0!==i.behaviour){if(c.behaviour.type!==i.behaviour.type)return!1}else{if(c.variable!==i.variable)return!1;if(a){if(c.value!==i.value)return!1}else{if(!b(v(c.value,n,o,r),v(i.value,n,o,r)))return!1}}}return!0}function i(t,n,o,r){if(o===t.length-1)return[];let a=t.slice(o+1).findIndex((e=>{return!("equals"===(t=e).type||"doEffect"===t.type||"getEffect"===t.type)||"getEffect"===e.type;var t}));-1===a&&(a=t.length);const s=t.slice(o+1,o+1+a),c=[],u=o+1+a,p=t[u];if("getEffect"===(null==p?void 0:p.type)){const a=i(t,n,u,r),s=a.findIndex((e=>"getEffect"===e.type));if(-1!==s){const e=l({specIndex:n,eventIndex:s+u+o+1,eventType:"getEffect"},r);throw Error(`Can't put two "getEffect" events together in ${e}`)}c.push(e(e({},p),{options:[{resultVal:p.result.example,actions:a,position:{specIndex:n,eventType:"getEffect",eventIndex:u}}]}))}return[...s,...c]}function l(e,t){return`\n\nSpec name: "${t[e.specIndex]}"\nEvent number: ${e.eventIndex} (${e.eventType})\n\n`}function u(e,t,n){return[...e.slice(0,n),t,...e.slice(n+1)]}const p=e=>({type:"variableList",variable:e});function d(e){return"text"===e.type||"variableList"===e.type}function f(e,t){const n=e.find((({variable:e})=>e===t));if(!n)throw Error(`Unknown variable of type ${t.type}. Did you forget to return one in your spec?`);return n.name}function m(e,t,n,o,r){if(0===e.size)return t;const a=function(...e){const t=new Set,[n,...o]=e;switch(e.length){case 0:return t;case 1:return new Set(n);case 2:for(const e of n)o[0].has(e)&&t.add(e);return t;default:for(const e of n)o.every((t=>t.has(e)))&&t.add(e);return t}}(e,t);if(0===a.size)throw Error(`Inconsistent list behaviours defined for ${n}.\n\nPrevious behaviours: ${[...e].join(", ")}\nNew behaviours: ${[...t].join(", ")}\n\nin ${l(o,r)}`);return a}function v(e,t,n,o){if("string"==typeof e)return e;if(Array.isArray(e))return e.map((e=>v(e,t,n,o)));if("effectResult"===e.type){const t=o.find((t=>t.effect===e.effect));return t?t.state:""}const r=t.find((t=>t.variable===e));return n.state[r.name]}function h(e){const t={};return Object.entries(e).forEach((([e,n])=>{d(n)&&(t[e]=function(e){switch(e.type){case"text":return"";case"variableList":return[]}}(n))})),{state:t,focus:null}}function y(e,t){return E(e,t)===Object.keys(e.state).length}function E(e,t){return Object.entries(e.state).reduce(((e,[n,o])=>b(o,t.state[n])?e+1:e),0)}function b(e,t){return Array.isArray(e)&&Array.isArray(t)?Boolean(t.length)===Boolean(e.length):"string"==typeof e&&"string"==typeof t&&Boolean(t)===Boolean(e)}function S(t,n,o,r,a,s,c){const i=()=>l(a,c);switch(t.type){case"doEffect":return{specState:n,resultState:o};case"getEffect":return{specState:n,resultState:x(o,t.result.effect,t.result.example)};case"equals":{const{variable:a,value:c}=t,l=f(r,a),u=v(c,r,n,o),p={add:new Set,remove:new Set},d=s.index;if("variableList"===a.type){const t=n.state[l];if(!Array.isArray(u)||!Array.isArray(t))throw Error(`Can only set a variable list to an array in ${i()}`);const r=u[0],a=u[u.length-1],s=t[0],f=t[t.length-1];if(u.length===t.length){if(0===u.length||u.every(((e,n)=>e===t[n])))return{specState:n,resultState:o,listBehaviours:{type:"doNothing",name:l}};p.add.add("overwrite")}else if(0===u.length)t.length>1?p.remove.add("removeAll"):(p.remove.add("removeAll"),p.remove.add("removeFromEnd"),p.remove.add("removeFromIndex"),p.remove.add("removeFromStart"));else if(u.length===t.length+1)0===t.length?(p.add.add("addToEnd"),p.add.add("addToStart")):r===s?p.add.add("addToEnd"):a===f&&p.add.add("addToStart");else if(u.length===t.length-1)if(void 0!==d)r===s&&a===f?p.remove.add("removeFromIndex"):r!==s?(p.remove.add("removeFromIndex"),p.remove.add("removeFromStart")):a!==f&&(p.remove.add("removeFromIndex"),p.remove.add("removeFromEnd"));else{if(r===s&&a===f)throw Error(`Must remove array list at beginning or end without list context in ${i()}`);r===s?p.remove.add("removeFromEnd"):a===f&&p.remove.add("removeFromStart")}else{if(r===s||a===f)throw Error(`Invalid array operation in ${i()} You can only add one element at the beginning or end of array, replace array, clear array, or remove one element from beginning, end or list index of array`);p.add.add("overwrite")}return{specState:e(e({},n),{state:e(e({},n.state),{[l]:u})}),resultState:o,listBehaviours:p.add.size>0?{type:"add",behaviours:p.add,name:l,listEqualsVar:c}:p.remove.size>0?{type:"remove",behaviours:p.remove,name:l,index:d}:void 0}}return{specState:e(e({},n),{state:e(e({},n.state),{[l]:u})}),resultState:o}}}}async function g(t,n,o,r,a,s){switch(t.type){case"doEffect":{let e=function(e){const t=f(r,e);return n.state[t]};return t.effect.fn(e,a),{specState:n,resultState:o}}case"getEffect":{let e=function(e){const t=f(r,e);return n.state[t]};const c=await t.result.effect.fn(e,a),i=x(o,t.result.effect,c);return function(e,t){const n=e.options.find((e=>void 0!==e.resultVal&&void 0!==t&&b(e.resultVal,t)));return n?n.actions:(console.warn("Could not find actions based on effect result"),[])}(t,c).reduce((async(e,t)=>{const n=await e;return g(t,n.specState,n.resultState,r,a,s)}),Promise.resolve({specState:n,resultState:i}))}case"equals":{const{variable:c,value:i}=t,l=f(r,c);if(t.behaviour&&s){const c=n.state[l];if("shouldAdd"===t.behaviour.type){const a=s.add,{listEqualsVar:i}=t.behaviour,u=v(i,r,n,o);let p=[];return p="addToEnd"===a?[...c,u[u.length-1]]:"addToStart"===a?[u[0],...c]:u,{specState:e(e({},n),{state:e(e({},n.state),{[l]:p})}),resultState:o}}if("shouldRemove"===t.behaviour.type){const t=s.remove,{index:r}=a,i="removeAll"===t?[]:"removeFromEnd"===t?c.slice(0,c.length-1):"removeFromStart"===t?c.slice(1):"removeFromIndex"===t&&void 0!==r?[...c.slice(0,r),...c.slice(r+1)]:[];return{specState:e(e({},n),{state:e(e({},n.state),{[l]:i})}),resultState:o}}return{specState:n,resultState:o}}const u=v(i,r,n,o);return{specState:e(e({},n),{state:e(e({},n.state),{[l]:u})}),resultState:o}}}}function x(t,n,o){const r=t.findIndex((e=>e.effect===n));return-1!==r?u(t,e(e({},t[r]),{state:o}),r):[...t,{effect:n,state:o}]}function w(t,n,o,r,a,p,d,v,h,E,b,g,x,w){const L={specIndex:o,eventIndex:n,eventType:t.type};switch(t.type){case"pageLoad":{const e=i(p,o,n,w);if(0===o)return d.actions=e,{specState:r,resultState:a,listContext:x};if(!c(e,d.actions,g,r,a,!1)){const e=l(L,w);throw Error(`Conflicting actions with other specs on page load in ${e}`)}return C(d.actions,e,g,r,a,w),{specState:r,resultState:a,listContext:x}}case"clickOn":switch(t.component.type){case"button":const u=i(p,o,n,w),d=s(b,t.component),f=v[d];if(f){const e=f.find((e=>y(e.state,r)||c(e.actions,u,g,r,a,!0)));if(e){if(!c(e.actions,u,g,r,a,!1)){const t=l(e.positions[0],w),n=l(L,w);throw Error(`Conflicting actions for the same state for button ${d} in ${t} and ${n}`)}e.positions.push(L),C(e.actions,u,g,r,a,w)}else f.push({state:r,button:t.component,actions:u,positions:[L]})}else v[d]=[{state:r,button:t.component,actions:u,positions:[L]}];return{specState:e(e({},r),{focus:t.component}),resultState:a,listContext:null};case"input":return{specState:e(e({},r),{focus:t.component}),resultState:a,listContext:null};case"componentList":return{specState:r,resultState:a,listContext:x}}case"clickOnList":switch(t.component.component.type){case"button":const u=i(p,o,n,w),f=s(b,t.component),m=h[f];if(m){const e=m.find((e=>y(e.state,r)||c(e.actions,u,g,r,a,!0)));if(e){if(!c(e.actions,u,g,r,a,!1)){const t=l(e.positions[0],w),n=l(L,w);throw Error(`Conflicting actions for the same state for component list ${f} in ${t} and ${n}`)}e.positions.push(L),C(d.actions,u,g,r,a,w)}else m.push({state:r,actions:u,positions:[L]})}else h[f]=[{state:r,actions:u,positions:[L]}];return{specState:e(e({},r),{focus:t.component}),resultState:a,listContext:{index:t.index,variable:t.component.connectedVariable}};case"input":return{specState:e(e({},r),{focus:t.component}),resultState:a,listContext:{index:t.index,variable:t.component.connectedVariable}}}case"doEffect":return{specState:r,resultState:a,listContext:x};case"getEffect":const{resultState:k}=S(t,r,a,g,L,{},w);return{specState:r,resultState:k,listContext:x};case"equals":const V=x&&x.variable===t.variable?x.index:void 0,{specState:$,listBehaviours:T}=S(t,r,a,g,L,{index:V},w);if(T){const{name:n}=T;if(E[n]||(E[n]={add:new Set,remove:new Set}),"add"===T.type){const o=m(E[n].add,T.behaviours,n,L,w);return E[n].add=o,{specState:$,resultState:a,listContext:x,replacedEvent:e(e({},t),{behaviour:{type:"shouldAdd",listEqualsVar:T.listEqualsVar}})}}if("remove"===T.type){const o=m(E[n].remove,T.behaviours,n,L,w);return E[n].remove=o,{specState:$,resultState:a,listContext:x,replacedEvent:e(e({},t),{behaviour:{type:"shouldRemove"}})}}if("doNothing"===T.type)return{specState:$,resultState:a,listContext:x,replacedEvent:e(e({},t),{behaviour:{type:"doNothing"}})}}return{specState:$,resultState:a,listContext:x};case"enterText":const I=r.focus;if("input"===(null==I?void 0:I.type)){if(!I.connectedVar){const e=s(b,I),t=l(L,w);throw Error(`Input ${e} is missing connected text variable when text is entered in ${t}`)}const n=f(g,I.connectedVar);return{specState:e(e({},r),{state:e(e({},r.state),{[n]:t.example})}),resultState:a,listContext:x}}if("componentList"===(null==I?void 0:I.type)&&"input"===I.component.type&&x){const n=f(g,I.connectedVariable);return{specState:e(e({},r),{state:e(e({},r.state),{[n]:u(r.state[n],t.example,x.index)})}),resultState:a,listContext:x}}return{specState:r,resultState:a,listContext:x}}}function C(e,t,n,o,r,a){const s=e[e.length-1],i=t[t.length-1];if("getEffect"===(null==s?void 0:s.type)&&"getEffect"===(null==i?void 0:i.type)){let e=null;if(s.options.forEach((t=>{i.options.forEach((a=>{void 0===t.resultVal||void 0===a.resultVal||!b(t.resultVal,a.resultVal)||c(t.actions,a.actions,n,o,r,!1)||(e=[t.position,a.position])}))})),null!==e){const t=l(e[0],a),n=l(e[1],a);throw Error(`Conflicting actions for the same getEffect result in ${n} and ${t}`)}s.options.push(...i.options)}}function L(t,n,o,r,s){const c=Object.entries(t).map((([e,t])=>({fieldName:e,fieldValue:t}))),i=c.filter((({fieldValue:e})=>a(e))).map((({fieldName:e,fieldValue:t})=>({name:e,component:t}))),l=c.filter((({fieldValue:e})=>d(e))).map((({fieldName:e,fieldValue:t})=>({name:e,variable:t}))),p=function(t,n,o,r,a){const s={actions:[]},c={actions:[]},i={},l={},u={};return t.forEach(((t,p)=>{let d=h(n),f=[],m=null;t.map(((t,n,s)=>{const{specState:i,resultState:l,listContext:u,replacedEvent:v}=w(t,n,p,d,f,s,c,{},{},{},o,r,m,a);return d=i,f=l,m=u,v&&"equals"===t.type&&"equals"===v.type?e(e({},t),{behaviour:v.behaviour}):t})).reduce((({specState:e,resultState:t,listContext:n},c,d,f)=>w(c,d,p,e,t,f,s,i,l,u,o,r,n,a)),{specState:h(n),listContext:null,resultState:[]})})),Object.entries(u).forEach((([e,t])=>{if(t.add.size>1){const n=[...t.add].join(" or ");console.warn(`Couldn't determine exact add to array behaviour for ${e} (could be ${n}), try adding more test cases to clarify.`)}else if(t.remove.size>1){const n=[...t.remove].join(" or ");console.warn(`Couldn't determine exact remove from array behaviour for ${e} (could be ${n}), try adding more test cases to clarify.`)}})),{pageLoad:s,buttonEvents:i,buttonListEvents:l,variableListBehaviour:u}}(n,t,i,l,s),m={},v={},y={};return i.forEach((({name:t,component:n})=>{if("button"===n.type)m[t]=(e,n)=>({onClick:async()=>{const a=k(p.buttonEvents[t],e,s);null!==a&&a.actions.reduce((async(e,t)=>{const{specState:n,resultState:a}=await e;let s;if("equals"===t.type&&"variableList"===t.variable.type){const e=p.variableListBehaviour[f(l,t.variable)],o=[...e.add][0],r=[...e.remove][0];s=g(t,n,a,l,{},{add:o,remove:r})}else s=g(t,n,a,l,{});const c=await s;return o((()=>c.specState)),r((()=>c.resultState)),c}),Promise.resolve({specState:e,resultState:n}))}});else if("input"===n.type){const r=n.connectedVar?f(l,n.connectedVar):null;v[t]={connectedVariableName:r,onChange:t=>{null!==r&&o((n=>e(e({},n),{state:e(e({},n.state),{[r]:t})})))}}}else if("componentList"===n.type){const a=f(l,n.connectedVariable);y[t]=(c,i)=>{const d=n.component.type;if("input"===d)return{connectedVariableName:a,onChange:(t,n)=>{o((o=>e(e({},o),{state:e(e({},o.state),{[a]:u(o.state[a],t,n)})})))}};if("button"===d)return{onClick:async e=>{const n=p.buttonListEvents[t],u=p.variableListBehaviour[a],d=[...u.add][0],f=[...u.remove][0],m=k(n,c,s);null!==m&&m.actions.reduce((async(t,n)=>{const{specState:a,resultState:s}=await t,c=await g(n,a,s,l,{index:e},{add:d,remove:f});return o((()=>c.specState)),r((()=>c.resultState)),c}),Promise.resolve({specState:c,resultState:i}))}};throw Error(`Invalid component type ${d}`)}}})),{onPageLoad:(e,t)=>{p.pageLoad.actions.reduce((async(e,t)=>{const{specState:n,resultState:a}=await e,s=await g(t,n,a,l,{});return o((()=>s.specState)),r((()=>s.resultState)),s}),Promise.resolve({specState:e,resultState:t}))},buttons:m,inputs:v,lists:y}}function k(e,t,n){if(!e||0===e.length)return null;const o=e.map((e=>({event:e,score:E(e.state,t)}))).sort(((e,t)=>t.score-e.score)),r=o[0],a=o[1];if(r.score===(null==a?void 0:a.score)){const e=r.event.positions[0],t=a.event.positions[0],o=l(e,n),s=l(t,n);console.warn(`Couldn't pick between similarity score of events in ${o} and ${s} so going with the first one.`)}return r.event}const V=e=>({type:"effect",fn:e});function $(e){const{spec:n,events:o,initSpecState:r,initEffectResultState:s,specDescriptions:c}=t.useMemo((()=>function(e){const t=[],n=e=>n=>{t[e].push({type:"doEffect",effect:n})},o=e=>(n,o)=>{const r={type:"effectResult",effect:n,example:o};return t[e].push({type:"getEffect",result:r,options:[]}),r},r=e=>n=>{t[e].push({type:"enterText",example:n})},a=e=>n=>{t[e].push({type:"clickOn",component:n})},s=e=>(n,o)=>{t[e].push({type:"equals",variable:n,value:o})},c=[],i=e(((e,i)=>{const l=t.length;var u;t.push([{type:"pageLoad"}]),c.push(e),i({doEffect:n(l),getEffect:o(l),enterText:r(l),clickOn:a(l),clickOnIndex:(u=l,(e,n)=>{t[u].push({type:"clickOnList",component:e,index:n})}),equals:s(l)})}));return{spec:i,initSpecState:h(i),initEffectResultState:[],events:t,specDescriptions:c}}(e)),[e]),[i,l]=t.useState(r),[u,p]=t.useState(s),f=t.useMemo((()=>L(n,o,l,p,c)),[n]);return t.useEffect((()=>{f.onPageLoad(i,u)}),[]),function(e,t,n,o){const r={};return Object.entries(t).forEach((([t,s])=>{const c=t;a(s)?r[c]=function(e,t,n,o,r){switch(t.type){case"button":return{onClick:r.buttons[e](n,o).onClick};case"input":const a=r.inputs[e],s=a.connectedVariableName;return{value:null!==s?n.state[s]:"",onChange:e=>{const t=e.target.value;a.onChange(t)},type:t.inputType};case"componentList":const c=t.component.type,i=r.lists[e](n,o);if("button"===c&&"onClick"in i)return e=>({onClick:()=>i.onClick(e)});if("input"===c&&"onChange"in i){const e=n.state[i.connectedVariableName];return t=>({value:e[t]||"",onChange:e=>{const n=e.target.value;i.onChange(n,t)}})}throw Error(`Couldn't find component list handlers for ${e}`)}}(t,s,n,o,e):d(s)&&(r[c]=n.state[c])})),r}(f,n,i,u)}const T=e=>{const t={type:"text"},n=r(t),o={type:"text"},a=r({inputType:"password",connectedVar:o}),s={type:"text"},c={type:"button"},i=V((e=>{console.log("POST",{email:e(t),password:e(o)})}));return e("Can sign up with email and password",(({clickOn:e,enterText:t,doEffect:o,equals:r})=>{e(n),t("hi@test.com"),e(a),t("password!"),e(c),o(i),r(s,"")})),e("Shows error if empty email",(({clickOn:e,equals:t})=>{e(c),t(s,"Email can't be empty")})),e("Shows error if empty password",(({clickOn:e,enterText:t,equals:o})=>{e(n),t("hi@test.com"),e(c),o(s,"Password can't be empty")})),{EmailInput:n,EmailText:t,PasswordInput:a,PasswordText:o,SignUpButton:c,ErrorText:s}};function I(){const n=$(T);return t.createElement("div",{className:"App"},t.createElement("label",null,"Email ",t.createElement("input",e({},n.EmailInput))),t.createElement("label",null,"Password ",t.createElement("input",e({},n.PasswordInput))),t.createElement("button",e({},n.SignUpButton),"Sign Up"),n.ErrorText&&t.createElement("span",{className:"error"},n.ErrorText))}const A=e=>{const t={type:"text"},n={type:"text"},o=V((async()=>{const e=Math.floor(15*Math.random()),t=await fetch(`https://jsonplaceholder.typicode.com/users/${e}`);if(t.ok){return(await t.json()).name}return""}));return e("Can show username on page load",(({getEffect:e,equals:r})=>{r(n,"Loading");const a=e(o,"7fb6ff5");r(t,a),r(n,"")})),e("Shows error if no username",(({getEffect:e,equals:r})=>{r(n,"Loading"),e(o,""),r(t,""),r(n,"Couldn't get user")})),{Username:t,Status:n}};function N(){const e=$(A);return t.createElement("div",{className:"App"},e.Username&&t.createElement("span",null,"Username: ",e.Username),e.Status&&t.createElement("span",null,e.Status))}const O=e=>{const t={type:"text"},n=r(t);return e("Can type username",(({clickOn:e,enterText:t})=>{e(n),t("hello")})),{UsernameInput:n,UsernameText:t}};function q(){const n=$(O);return t.createElement("div",{className:"App"},t.createElement("label",null,"Username ",t.createElement("input",e({},n.UsernameInput))),t.createElement(F,{username:n.UsernameText}))}function F({username:n}){const o=$(t.useMemo((()=>(e=>t=>{const n={type:"button"},o=V((()=>{console.log(e)}));return t("Logs username prop when clicked on",(({clickOn:e,doEffect:t})=>{e(n),t(o)})),{LogButton:n}})(n)),[n]));return t.createElement("button",e({},o.LogButton),"Log username")}const B=e=>{const t={type:"text"},n={type:"button"},o=V((()=>(10*Math.random()).toFixed(0)));return e("Can generate random numbers",(({clickOn:e,getEffect:r,equals:a})=>{const s=r(o,"8");a(t,s),e(n);const c=r(o,"3");a(t,c)})),{GenerateButton:n,RandomNumber:t}};function U(){const n=$(B);return t.createElement("div",{className:"App"},t.createElement("button",e({},n.GenerateButton),"Generate"),n.RandomNumber&&t.createElement("span",null,n.RandomNumber))}const j=e=>{const t={type:"text"},n=r(t),a=p({type:"text"}),s=o(r(),a),c=o({type:"button"},a),i={type:"button"},l=V(((e,{index:t})=>{void 0!==t&&console.log("Removing",e(a)[t])}));return e("Can create multiple TODO cards",(({clickOn:e,clickOnIndex:o,enterText:r,equals:u,doEffect:p})=>{e(n),r("Wash the dishes"),e(i),u(a,[t]),u(t,""),e(n),r("Clean the kitchen"),e(i),u(a,["Wash the dishes",t]),u(t,""),e(n),r("Feed the cat"),e(i),u(a,["Wash the dishes","Clean the kitchen",t]),u(t,""),o(c,1),p(l),u(a,["Wash the dishes","Feed the cat"]),e(n),r("Water the plants"),e(i),u(a,["Wash the dishes","Feed the cat",t]),u(t,""),o(s,0),r("Hang up clothes")})),e("Will not create card with empty text",(({clickOn:e,enterText:t,equals:o})=>{e(n),t(""),e(i),o(a,[])})),{NewCardInput:n,NewCardText:t,CardsList:a,AddButton:i,CardInputsList:s,RemoveButtonsList:c}};function R(){const n=$(j);return t.createElement("div",{className:"App"},t.createElement("label",null,"New Card ",t.createElement("input",e({},n.NewCardInput))),t.createElement("button",e({},n.AddButton),"Add"),n.CardsList.map(((o,r)=>{const a=n.RemoveButtonsList(r),s=n.CardInputsList(r);return t.createElement("div",{key:r},t.createElement("input",e({},s)),t.createElement("button",e({},a),"X"))})))}const M=e=>{const t=p({type:"text"}),n={type:"text"},o=V((async()=>{const e=await fetch("https://conduit.productionready.io/api/articles?limit=10&offset=0");if(e.ok){return(await e.json()).articles.map((e=>e.title))}return[]}));return e("Can show article list",(({getEffect:e,equals:r})=>{r(n,"Loading");const a=e(o,["My title 1","My title 2"]);r(t,a),r(n,"")})),e("Shows error if can't load",(({getEffect:e,equals:r})=>{r(n,"Loading"),e(o,[]),r(t,[]),r(n,"Couldn't get articles")})),{ArticleTitles:t,Status:n}};function P(){const e=$(M);return t.createElement("div",{className:"App"},e.ArticleTitles.length>0&&t.createElement("span",null,"Article titles: ",e.ArticleTitles.join(", ")),e.Status&&t.createElement("span",null,e.Status))}function W(){const[e,n]=t.useState(t.createElement(I,null));return t.createElement(t.Fragment,null,t.createElement(z,{setView:n}),e)}function z(e){const[n,o]=t.useState("EmailForm");return t.createElement("div",{className:"Select"},t.createElement("div",{className:"row"},t.createElement("button",{onClick:()=>{e.setView(t.createElement(I,null)),o("EmailForm")}},"Signup form"),t.createElement("button",{onClick:()=>{e.setView(t.createElement(N,null)),o("FetchUser")}},"Fetch User"),t.createElement("button",{onClick:()=>{e.setView(t.createElement(q,null)),o("Nested")}},"Nested spec"),t.createElement("button",{onClick:()=>{e.setView(t.createElement(U,null)),o("RandomNumber")}},"Random"),t.createElement("button",{onClick:()=>{e.setView(t.createElement(R,null)),o("TodoApp")}},"TODO app"),t.createElement("button",{onClick:()=>{e.setView(t.createElement(P,null)),o("Articles")}},"Articles")),t.createElement("a",{href:`https://github.com/edbentley/spectate/tree/master/react-app/src/examples/${n}.tsx`},"View Code: ",n,".tsx"))}n.render(t.createElement(t.StrictMode,null,t.createElement(W,null)),document.getElementById("root"));