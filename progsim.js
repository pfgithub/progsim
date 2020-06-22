{
let el = (nme) => document.createElement(nme);
let txt = (txt) => document.createTextNode(txt);
let anychange = (itms, cb) => (itms.forEach(itm => itm.oninput = () => cb()), cb());
Node.prototype.attr = function(atrs) {Object.entries(atrs).forEach(([k, v]) => this.setAttribute(k, v)); return this;}
Node.prototype.adto = function(prnt) {prnt.appendChild(this); return this;}
Node.prototype.adch = function(chld) {this.appendChild(chld); return this;}
Node.prototype.atxt = function(txta) {this.appendChild(txt(txta)); return this;}
Node.prototype.onev = function(evnm, cb) {this.addEventListener(evnm, cb); return this;}
Node.prototype.drmv = function(defer) {defer(() => this.remove()); return this;}
Node.prototype.clss = function(clss) {clss.split(".").filter(q => q).map(itm => this.classList.add(itm)); return this;}
Object.prototype.dwth = function(cb) {cb(this); return this;}

let css = ([txt]) => txt;
let mainStyle = css`
html {
	background-color: white;
}
body {
	margin: 0;
}
html, body {
  height: 100%;

  display: flex;
  flex-direction: column;
}

body > * {
	flex-shrink: 0;
}
.codetab {
	flex-grow: 1;
}
.codeedit {
	display: block;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	border: 0;
	resize: none;
	margin: 0;
}
.tablist {
	position: relative;
}
.tablist:after {
	bottom: 0;
	height: 1px;
	background-color: black;
	left: 0;
	width: 100%;
	content: "";
	position: absolute;
	z-index: 0;
}
.tab {
	z-index: 1;
	border: 1px solid #000;
	border-radius: 5px;
	padding: 5px;
	padding-left: 15px;
	padding-right: 15px;
	margin: 3px;
	background-color: #eee;
	margin-bottom: 0;
	position:relative;
	transition: 0.1s border-radius, 0.1s border-bottom, 0.1s background-color;
}
.tab.active {
	border-bottom: 1px solid #fff;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	background-color: #fff;
}
.comment { color: #212830; font-style: italic; }
.regdisp.edited {
	background-color: #acf;
}
.regdisp.viewed {
	background-color: #afa;
}
.codeline {
	white-space: pre;
}
.codeline.next {
	background-color: #ffa;
}
.label { font-weight: bold; }
.instr { color: blue; }
.reg { color: red; }
.todo { background-color: #faa; }
.immediate { color: green; }
`.trim();
let defaultCode = `
set $r0 ← 5
set $r1 ← 6
add $r2 ← $r0 + $r1

# todo fill this out
`.trim();

let docs = {
	"set": "eg: set $r0 ← 5. sets the value in the register $r0 to 5.",
	"add": "eg: add $r0 ← $r1 + $r2. sets the value in the register $r0 to $r1 plus $r2.",
	"goto": "eg: goto :label. after this, instruction, start running instructions at :label instead of the next instruction.",
};

function makeDefer() {
	let list = [];
	let res = (cb) => {list.push(cb)};
	res.cleanup = () => {
		for(let i = list.length - 1; i >= 0; i--) {
			list[i]();
		}
	}
	return res;
}

function CodeEditorView(parent, props) {
	let defer = makeDefer();
	let container = el("div").clss(".codetab").adto(parent).drmv(defer);
	
	el("textarea").clss(".codeedit").adto(container).dwth(v => v.value = props.text.text)
		.onev("input", e => {props.text.text = e.currentTarget.value; localStorage.setItem("code", props.text.text);})
		.attr({autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false"});
	
	return {remove() {
		defer.cleanup();
	}};
}

let colr = (color, txt) => el("span").attr({class: color}).atxt(txt.replace(/<-/g, "←"));
let qcol = (split, ...itms) => {
	let res = document.createDocumentFragment();
	split.forEach((txt, i) => {
		if(i !== 0) colr("", " ").adto(res);
		colr(itms[i], txt).adto(res);
	});
	return res;
}

let visibleRegs = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
let defaultRegisters = {r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, r7: 0, ip: 0, sp: 0, fl: 0, sc: 0};

function AsmRunnerView(parent, props) {
	let defer = makeDefer();
	let container = el("div").adto(parent).drmv(defer);
	
	// instruction pointer, stack pointer, flag (eg flag if $r0 > 5\n+ print $r0), unused
	let jumpPoints = {};
	
	let lines = [];
	
	let regsArea = el("div").adto(container);
	let regsDisplay = {};
	visibleRegs.forEach((regNme, i) => {
		if(i !== 0) regsArea.atxt(", ");
		let regEl = el("span").attr({class: "regdisp"}).adto(regsArea);
		colr("reg", "$"+regNme).adto(regEl);
		regEl.atxt(": ");
		let immed = el("span").attr({class: "immediate"}).adto(regEl);
		let tn = txt("...").adto(immed);
		regsDisplay[regNme] = {text: tn, reg: regEl};
	});
	
	let buttonArea = el("div").adto(container);
	
	let codeContainer = el("div").adto(container);
	lines.push({liel: el("div"), action: "nop"});
	for(let line of [...props.text.text.split("\n"), ""]) {
		let liel = el("div").adto(codeContainer).attr({class: "codeline"});
		if(!line.trim()) {
			lines.push({liel, action: "nop"});
			liel.atxt(" "); continue;
		}else if(line.startsWith("#")) {
			lines.push({liel, action: "nop"});
			colr("comment", line).adto(liel); continue;
		}else if(line.endsWith(":")) {
			lines.push({liel, action: "nop"});
			colr("label", line).adto(liel);
			let name = line.substr(0, line.length - 1);
			jumpPoints[name] = lines.length - 1; 
			continue;
		}
		let split = line.split(" ");
		let sp0 = split.shift();
		colr("instr", sp0 + " ").adto(liel).attr({title: docs[sp0] || "no documentation"});
		if(sp0 === "add") {
			let [out, , one, , two] = split;
			lines.push({liel, action: "add", out, one, two});
			liel.adch(qcol(split, "reg", "", "reg", "", "reg"));
		}else if(sp0 === "set") {
			let [reg, , val] = split;
			lines.push({liel, action: "set", reg, val});
			liel.adch(qcol(split, "reg", "", val.startsWith("$") ? "reg" : "immediate"))
		}else if(sp0 === "input") {
			let [reg] = split;
			lines.push({liel, action: "input", reg});
			liel.adch(qcol(split, "reg"));
		}else if(sp0 === "goto") {
			let [mark] = split;
			lines.push({liel, action: "goto", mark});
			liel.adch(qcol(split, "label"));
		}else if(sp0 === "random") {
			let [out, , low, , high] = split;
			lines.push({liel, action: "random", out, low, high});
			liel.adch(qcol(split, "reg", "", "reg", "", "reg"));
		}else{
			liel.classList.add("todo");
			colr("", split.join(" ")).adto(liel);
		}
	}
	
	let runInstruction = (data) => {
		let instr = data.lines[data.registers.ip];
		
		let viewedRegisters = [];
		let setRegisters = [];
		
		let getReg = (reg) => {let sr1 = reg.substr(1); viewedRegisters.push(sr1); return data.registers[sr1];};
		let setReg = (reg, v) => {let sr1 = reg.substr(1); setRegisters.push(sr1); data.registers[sr1] = v;};
		
		if(!data.lines[data.registers.ip + 1]) return {viewedRegisters, setRegisters};
		data.simCount.count += 1;
		setReg("$ip", getReg("$ip") + 1);
		
		if(instr.action === "nop") {
			
		}else if(instr.action === "set") {
			if(instr.val.startsWith("$")) {
				setReg(instr.reg, getReg(instr.val));
			}else{
				setReg(instr.reg, +instr.val);
			}
		}else if(instr.action === "random") {
			let high = getReg(instr.high);
			let low = getReg(instr.low);
			setReg(instr.out, Math.floor(Math.random() * (high - low)) + low);
		}else if(instr.action === "add") {
			setReg(instr.out, getReg(instr.one) + getReg(instr.two));
		}else if(instr.action === "input") {
			if(data.inputs.current >= data.inputs.preset.length) {
				let num = NaN;
				while(isNaN(num)) num = prompt("");
				data.inputs.preset.push(num);
			}
			let v = +data.inputs.preset[data.inputs.current];
			setReg(instr.reg, v);
			data.inputs.current += 1;
		}else if(instr.action === "goto") {
			let mark = instr.mark.substr(1);
			if(!(mark in jumpPoints)) {
				alert("No label :"+mark);
			}
			let jumpPoint = jumpPoints[mark];
			setReg("$ip", jumpPoint);
		}else throw new Error("Unsupported "+instr.action);
		
		return {viewedRegisters, setRegisters};
	}
	
	let initSimulation = (inputs) => {
		let registers = {...defaultRegisters};
		let simCount = {count: 0};
		return {inputs, registers, lines, simCount};
	}
	let inputs = {current: 0, preset: []};
	
	let unhl = (sim) => {
		let instr = sim.lines[sim.registers.ip];
		instr.liel.classList.remove("next");
	};
	let rehl = (sim, updReg = {viewedRegisters: [], setRegisters: []}) => {
		let instr = sim.lines[sim.registers.ip];
		instr.liel.classList.add("next");
		
		for(let regName of visibleRegs) {
			let rgdisp = regsDisplay[regName];
			let ntxt = "" + sim.registers[regName];
			rgdisp.text.nodeValue = ntxt;
			rgdisp.reg.classList.remove("viewed");
			rgdisp.reg.classList.remove("edited");
			if(updReg.viewedRegisters.includes(regName)) rgdisp.reg.classList.add("viewed");
			if(updReg.setRegisters.includes(regName)) rgdisp.reg.classList.add("edited");
		}
	}
	
	let sim = initSimulation(inputs);
	rehl(sim);
	let reset = e => {
		e.stopPropagation();
		
		unhl(sim);
		inputs = {current: 0, preset: []};
		sim = initSimulation(inputs);
		rehl(sim);
	};
	let backup = e => {
		e.stopPropagation();
		
		unhl(sim);
		let nsc = Math.max(sim.simCount.count - 1, 0);
		inputs.current = 0;
		sim = initSimulation(inputs);
		let lst;
		while(sim.simCount.count < nsc) lst = runInstruction(sim);
		rehl(sim, lst);
	};
	let advance = e => {
		e.stopPropagation();
		
		unhl(sim);
		let updReg = runInstruction(sim);
		rehl(sim, updReg);
	};
	let play = e => {
		e.stopPropagation();
		
		unhl(sim);
		let luReg;
		while(sim.registers.ip < lines.length - 1) luReg = runInstruction(sim);
		rehl(sim, luReg);
	}
	el("button").atxt("|<").adto(buttonArea).onev("click", reset);
	el("button").atxt("<-").adto(buttonArea).onev("click", backup);
	el("button").atxt("->").adto(buttonArea).onev("click", advance);
	el("button").atxt(">|").adto(buttonArea).onev("click", play);
	
	let kdevl = k => {
		if(k.code === "ArrowRight") advance(k);
		if(k.code === "ArrowLeft") backup(k);
	}
	document.addEventListener("keydown", kdevl);
	defer(() => document.removeEventListener("keydown", kdevl));
	
	// runInstruction({inputs, registers, lines, simCount})
	
	return {remove() {
		defer.cleanup();
	}};
}

function AppView(parent, props) {
	let defer = makeDefer();
	
	el("style").atxt(mainStyle).adto(document.head).drmv(defer);
	
	let text = {text: localStorage.getItem("code") || defaultCode};
	
	let cev;
	let btns = {};
	let active = "";
	let run = (name) => {
		cev && cev.remove();
		btns[active] && btns[active].classList.remove("active");
		active = name;
		btns[active] && btns[active].classList.add("active");
		if(name === "code") {
			cev = CodeEditorView(parent, {text, run});
		}else if(name === "asm") {
			cev = AsmRunnerView(parent, {text, run});
		}else if(name === "instructions") {}
		localStorage.setItem("tab", active);
	}
	
	let container = el("div").clss(".tablist").adto(parent);
	let mbtn = (name, title) => btns[name] = el("button").clss(".tab").adto(container).atxt(title).onev("click", () => run(name))
	mbtn("code", "Code");
	mbtn("asm", "Run");
	mbtn("docs", "Instructions");
	run(localStorage.getItem("tab") || "asm");
	
	defer(() => cev.remove());
	
	return {remove() {
		defer.cleanup();
	}};
}

window.reset && window.reset();
let mainEl = document.getElementById("main") || document.body;
let apv = AppView(mainEl, {});
window.reset = () => apv.remove();
}