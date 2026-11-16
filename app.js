const names = {
  ivory:'奶油白波纹', red:'陶红贝壳', blue:'蓝藤瓷', yellow:'黄蓝复古', pink:'粉色碎花', green:'绿叶花环',
  toast:'厚切吐司', pancake:'原味松饼', strawberry:'草莓', banana:'香蕉', blueberry:'蓝莓', kiwi:'奇异果',
  lemon:'柠檬', rosemary:'迷迭香', caramel:'焦糖脆粒', chocolate:'巧克力碎',
  cream:'奶油', cocoa:'巧克力酱', jam:'草莓酱', sugar:'糖粉', honey:'蜂蜜淋线', none:'不加抹酱',
};
const plates = ['ivory','red','blue','yellow','pink','green'];
const plateLimits = [37, 29, 23, 19, 24, 22];
const foods = { strawberry:98, banana:78, blueberry:39, kiwi:92, lemon:90, rosemary:92, caramel:65, chocolate:65 };
const spreads = { cream:'#fff1cf', cocoa:'#75402e', jam:'#bd4860' };
const steps = ['基底','抹酱','配料','点缀','摆盘'];
const titles = ['先选一种基底','抹一点喜欢的酱','摆上喜欢的配料','加一点点缀','挑一只喜欢的盘'];
const descriptions = ['今天想做吐司，还是松饼？','选一种抹酱，也可以直接继续。','选好配料，再点食物。可以连续放置。','糖粉和蜂蜜可以单独添加。','滑动挑选花纹，拖动食物调整摆位。'];
const storageKey = 'little-dessert-table-v1';
const fresh = () => ({step:0, reached:0, base:null, spread:'none', toppings:[], finish:[], plate:'ivory', x:0, y:0});
let state = fresh();
try { state = JSON.parse(localStorage.getItem(storageKey)) || state; } catch {}
let history = [], ingredient = null, selected = -1, category = 0, cursor = {x:0,y:0}, ghost = null, drag = null;
const $ = id => document.getElementById(id);
const canvas = $('plate');
const images = Object.fromEntries([...plates,'toast','pancake',...Object.keys(foods)].map(id => {
  const img = new Image();
  img.onload = () => draw();
  img.onerror = () => status('有素材加载失败，请刷新重试。');
  img.src = './assets/' + id + '.webp';
  return [id,img];
}));
function status(message = '') { $('status').textContent = message; }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { status('浏览器无法保存草稿，刷新前请先保存图片。'); }
}
function record(previous) {
  history.push(previous);
  if (history.length > 60) history.shift();
  save();
  render();
}
function change(edit) {
  const previous = structuredClone(state);
  edit();
  record(previous);
}
function limit(x,y,radius) {
  const distance = Math.hypot(x,y) || 1;
  const scale = Math.min(1,radius / distance);
  return {x:x * scale,y:y * scale};
}
function foodPoint(x,y) {
  if (state.base === 'pancake') return limit(x,y,146);
  return {x:Math.max(-138,Math.min(138,x)),y:Math.max(-136,Math.min(136,y))};
}
function allowed(x,y) {
  const point = foodPoint(x,y);
  return Math.abs(point.x-x) < .01 && Math.abs(point.y-y) < .01;
}
function sprite(ctx,id,x,y,size,angle=0) {
  const image = images[id];
  if (!image?.naturalWidth) return;
  const scale = size / Math.max(image.naturalWidth,image.naturalHeight);
  const width = image.naturalWidth*scale, height = image.naturalHeight*scale;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.drawImage(image,-width/2,-height/2,width,height);
  ctx.restore();
}
function draw(target=canvas, exported=false) {
  const ctx = target.getContext('2d');
  ctx.setTransform(target.width/800,0,0,target.height/800,0,0);
  ctx.clearRect(0,0,800,800);
  if (exported) {
    ctx.fillStyle = '#f4eadd';
    ctx.fillRect(0,0,800,800);
  }
  ctx.translate(400,400);
  ctx.save();
  ctx.shadowColor = '#60432a3b';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  sprite(ctx,state.plate,0,0,694);
  ctx.restore();
  if (!state.base) return;
  ctx.translate(state.x,state.y);
  ctx.save();
  ctx.shadowColor = '#52301842';
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 6;
  sprite(ctx,state.base,0,0,354);
  ctx.restore();
  if (state.spread !== 'none') {
    ctx.beginPath();
    if (state.base === 'pancake') ctx.ellipse(0,0,144,146,-.12,0,2*Math.PI);
    else ctx.roundRect(-140,-143,280,286,[37,35,25,28]);
    ctx.globalAlpha = .86;
    ctx.fillStyle = spreads[state.spread];
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  state.toppings.forEach(topping => {
    ctx.save();
    ctx.shadowColor = '#53321838';
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 5;
    sprite(ctx,topping.id,topping.x,topping.y,foods[topping.id],topping.angle);
    ctx.restore();
  });
  if (state.finish.includes('honey')) {
    ctx.strokeStyle = '#b66d26b0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i=0;i<5;i++) {
      const x = -90+i*43;
      ctx.moveTo(x-20,-108);
      ctx.bezierCurveTo(x+36,-42,x-24,36,x+26,108);
    }
    ctx.stroke();
  }
  if (state.finish.includes('sugar')) {
    ctx.fillStyle = '#fffaf0c4';
    for (let i=0;i<100;i++) {
      const radius = 145*Math.sqrt(i/100);
      ctx.beginPath();
      ctx.arc(Math.cos(i*2.4)*radius,Math.sin(i*2.4)*radius,1+i%3*.45,0,2*Math.PI);
      ctx.fill();
    }
  }
  if (!exported && state.step === 2) {
    const topping = state.toppings[selected];
    if (topping) {
      ctx.strokeStyle = '#2b6275';
      ctx.lineWidth = 3;
      ctx.setLineDash([6,5]);
      ctx.beginPath();
      ctx.arc(topping.x,topping.y,foods[topping.id]/2+6,0,Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (ingredient && ghost && allowed(ghost.x,ghost.y)) {
      ctx.globalAlpha = .48;
      sprite(ctx,ingredient,ghost.x,ghost.y,foods[ingredient]);
      ctx.globalAlpha = 1;
    }
  }
}
function button(label,callback,{active,disabled=false,primary=false}={}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.disabled = disabled;
  if (active !== undefined) el.setAttribute('aria-pressed',active);
  if (primary) el.className = 'primary';
  el.onclick = callback;
  return el;
}
function group(className,children) {
  const div = document.createElement('div');
  div.className = className;
  div.append(...children);
  return div;
}
function card(id,active,callback,food=false) {
  const el = button(names[id],callback,{active});
  el.className = food ? 'card food' : 'card';
  if (images[id]) {
    const img = new Image();
    img.src = images[id].src;
    img.alt = '';
    el.prepend(img);
  } else if (spreads[id]) {
    const swatch = group('swatch',[]);
    swatch.style.setProperty('--swatch',spreads[id]);
    el.prepend(swatch);
  }
  return el;
}
function go(step) {
  state.step = step;
  state.reached = Math.max(step,state.reached);
  ingredient = null;
  selected = -1;
  ghost = null;
  save();
  render();
  $('steps').querySelector('[aria-current]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function nudge(x,y) {
  if (!x && !y) {
    change(() => Object.assign(state,{x:0,y:0}));
  } else if (state.step === 4) {
    change(() => Object.assign(state,limit(state.x+x,state.y+y,plateLimits[plates.indexOf(state.plate)])));
  } else if (selected >= 0) {
    const item = state.toppings[selected];
    change(() => Object.assign(item,foodPoint(item.x+x,item.y+y)));
  }
}
function arrows(center=false) {
  const controls = [['左移','←',-8,0],['上移','↑',0,-8],['下移','↓',0,8],['右移','→',8,0]];
  const buttons = controls.map(([label,key,x,y]) => {
    const el = button(key,() => nudge(x,y));
    el.setAttribute('aria-label',label);
    return el;
  });
  if (center) buttons.push(button('居中',() => nudge(0,0)));
  return group('tools',buttons);
}
function remove() {
  if (selected < 0) return;
  const index = selected;
  selected = -1;
  change(() => state.toppings.splice(index,1));
}
function render() {
  const {step} = state;
  const done = step === 5;
  document.body.classList.toggle('done',done);
  $('undo').disabled = !history.length || done;
  $('steps').hidden = done;
  $('steps').replaceChildren(...steps.map((label,i) => {
    const el = button(label,() => go(i),{disabled:i>state.reached || (i>0 && !state.base)});
    if (i === step) el.setAttribute('aria-current','step');
    return el;
  }));
  const panel = $('panel');
  const scroll = panel.querySelector('.cards')?.scrollLeft || 0;
  const focus = panel.contains(document.activeElement)
    ? document.activeElement.getAttribute('aria-label') || document.activeElement.textContent : '';
  const title = document.createElement('h1');
  title.textContent = done ? '可以开动了' : titles[step];
  const description = document.createElement('p');
  const used = [state.base,state.spread,...state.toppings.map(item => item.id),...state.finish];
  description.textContent = done ? [...new Set(used)].filter(id => id && id !== 'none').map(id => names[id]).join(' · ') : descriptions[step];
  panel.replaceChildren(title,description);
  let cards = [];
  if (step === 0) cards = ['toast','pancake'].map(id => card(id,state.base===id,() => chooseBase(id)));
  if (step === 1) cards = ['none',...Object.keys(spreads)].map(id => card(id,state.spread===id,() => change(() => { state.spread=id; })));
  if (step === 2) {
    const filters = ['水果','香草','脆料'];
    const items = [['strawberry','banana','blueberry','kiwi','lemon'],['rosemary'],['caramel','chocolate']];
    panel.append(group('tools',filters.map((label,i) => button(label,() => { category=i; render(); },{active:category===i}))));
    cards = items[category].map(id => card(id,ingredient===id,() => { ingredient=id; selected=-1; ghost=null; render(); },true));
  }
  if (step === 3) cards = ['sugar','honey'].map(id => card(id,state.finish.includes(id),() => change(() => {
    state.finish = state.finish.includes(id) ? state.finish.filter(item => item!==id) : [...state.finish,id];
  })));
  if (step === 4) cards = plates.map((id,i) => card(id,state.plate===id,() => {
    if (state.plate===id) return;
    change(() => { state.plate=id; Object.assign(state,limit(state.x,state.y,plateLimits[i])); });
  }));
  if (cards.length) {
    const choices = group('cards',cards);
    panel.append(choices);
    choices.scrollLeft = scroll;
  }
  if (step === 2) {
    panel.append(group('tools',[button('调整配料',() => { ingredient=null; ghost=null; render(); },{active:!ingredient}),button('删除选中',remove,{disabled:selected<0})]));
    if (!ingredient && state.toppings.length) {
      const list = document.createElement('select');
      list.className = 'placed';
      list.setAttribute('aria-label','已放配料');
      list.add(new Option('选择已放配料','-1'));
      state.toppings.forEach((item,i) => list.add(new Option((i+1)+' · '+names[item.id],i)));
      list.value = selected;
      list.onchange = () => { selected=Number(list.value); render(); };
      panel.append(list);
      if (selected>=0) panel.append(arrows());
    }
  }
  if (step === 4) panel.append(arrows(true));
  $('hint').textContent = step===2 ? (ingredient ? '点食物放一份'+names[ingredient] : '点选或拖动已放的配料') : step===4 ? names[state.plate]+' · 可拖动食物微调' : '';
  $('hint').hidden = done;
  $('actions').replaceChildren(...(done
    ? [button('返回修改',() => go(4)),button('再做一份',restart),button('保存图片',exportImage,{primary:true})]
    : [button('上一步',() => go(step-1),{disabled:step===0}),button(step===4?'完成作品':'下一步',() => go(step+1),{disabled:!state.base,primary:true})]));
  if (focus) [...panel.querySelectorAll('button,select')].find(el => (el.getAttribute('aria-label')||el.textContent)===focus)?.focus({preventScroll:true});
  draw();
}
function chooseBase(id) {
  if (state.base===id) return;
  const previous = structuredClone(state);
  state.base=id;
  if (state.toppings.some(item => !allowed(item.x,item.y))) {
    if (!confirm('换基底会微调部分配料位置。继续换吗？')) { state=previous; return; }
    state.toppings.forEach(item => Object.assign(item,foodPoint(item.x,item.y)));
  }
  record(previous);
}
function add(x,y) {
  if (!allowed(x,y)) { status('请点在食物上。'); return; }
  if (state.toppings.length>=40) { status('这份作品最多放 40 样配料，可以先删除一些。'); return; }
  status();
  change(() => state.toppings.push({id:ingredient,x,y,angle:Math.sin(state.toppings.length*7)*.32}));
}
function pointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*800/rect.width-400-state.x,y:(event.clientY-rect.top)*800/rect.height-400-state.y};
}
canvas.onpointerdown = event => {
  if (!event.isPrimary || event.button!==0 || ![2,4].includes(state.step)) return;
  const {x,y} = pointer(event);
  if (state.step===2 && ingredient) { drag={id:event.pointerId,place:true}; canvas.setPointerCapture(event.pointerId); return; }
  if (state.step===2) {
    selected=state.toppings.findLastIndex(item => Math.hypot(item.x-x,item.y-y)<Math.max(23,foods[item.id]/2));
    render();
    if (selected<0) return;
  } else if (!allowed(x,y)) return;
  const item = state.step===2 ? state.toppings[selected] : state;
  drag={id:event.pointerId,previous:structuredClone(state),item,x:item.x,y:item.y,clientX:event.clientX,clientY:event.clientY};
  canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove = event => {
  if (drag?.id===event.pointerId && drag.item) {
    const scale = 800/canvas.getBoundingClientRect().width;
    const x = drag.x+(event.clientX-drag.clientX)*scale, y = drag.y+(event.clientY-drag.clientY)*scale;
    drag.invalid = state.step===2 && !allowed(x,y);
    Object.assign(drag.item,state.step===2 ? foodPoint(x,y) : limit(x,y,plateLimits[plates.indexOf(state.plate)]));
    draw();
  } else if (event.pointerType==='mouse' && state.step===2 && ingredient) {
    ghost=pointer(event);
    draw();
  }
};
canvas.onpointerleave = () => { ghost=null; draw(); };
canvas.onpointerup = event => {
  if (drag?.id!==event.pointerId) return;
  const completed=drag;
  drag=null;
  if (completed.place) { const {x,y}=pointer(event); add(x,y); }
  else if (completed.invalid) { state=completed.previous; draw(); }
  else if (completed.item.x!==completed.x || completed.item.y!==completed.y) record(completed.previous);
};
canvas.onpointercancel = event => {
  if (drag?.id!==event.pointerId) return;
  if (drag.previous) state=drag.previous;
  drag=null;
  draw();
};
canvas.onkeydown = event => {
  const moves = {ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
  if (moves[event.key] && (state.step===4 || (state.step===2 && (ingredient || selected>=0)))) {
    event.preventDefault();
    const [x,y] = moves[event.key];
    if (state.step===2 && ingredient) {
      cursor=foodPoint(cursor.x+x,cursor.y+y);
      ghost=cursor;
      draw();
    } else nudge(x,y);
  }
  if (state.step===2 && ingredient && event.key==='Enter') { event.preventDefault(); add(cursor.x,cursor.y); }
  if (state.step===2 && !ingredient && event.key==='Delete') remove();
};
$('undo').onclick = () => {
  const previous = history.pop();
  if (!previous) return;
  const step = previous.base ? state.step : 0;
  state = {...previous,step,reached:Math.max(state.reached,previous.reached)};
  selected=-1;
  save();
  render();
};
function restart() {
  if (!confirm('开始新作品会替换当前草稿。再做一份？')) return;
  state=fresh();
  history=[];
  go(0);
}
function exportImage() {
  const required = [state.plate,state.base,...state.toppings.map(item => item.id)];
  if (required.some(id => !images[id]?.naturalWidth)) { status('素材还没有加载完成，请稍后重试。'); return; }
  const output = document.createElement('canvas');
  output.width = output.height = 1600;
  draw(output,true);
  output.toBlob(blob => {
    if (!blob) { status('图片生成失败，请重试。'); return; }
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href=url;
    download.download='little-dessert-table.png';
    download.click();
    setTimeout(() => URL.revokeObjectURL(url),15000);
    status('已生成成品图片。');
  },'image/png');
}
render();
