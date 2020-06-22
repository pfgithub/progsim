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
.codeline { white-space: pre-wrap; }
.codeline.todo { background-color: #faa; }
.codeline.next { background-color: #ffa; }
.codeline.executing { background-color: #aaf; }
.lineno {
	font-family: monospace;
	color: darkgray;
	border: 0;
	background-color: transparent;
	margin: 0;
	margin-left: 0;
	padding: 0;
	padding-right: 11px;
	display: inline-block;
	height: 1.7em;
	cursor: pointer;
}
.lineno.breakpoint {
	color: black;
	font-weight: bold;
	background-color: rgba(0, 0, 0, 0.2);
}
.lineno:focus {
	outline: none;
}
.lineno::-moz-focus-inner {
	border: 0;
}
.lineno:hover > .number, .lineno:focus > .number {
	text-decoration: underline;
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
.regdisp {
	white-space: pre;
}
.regdisp.edited {
	background-color: #acf;
}
.regdisp.viewed {
	background-color: #afa;
}
.label { font-weight: bold; }
.instr { color: blue; }
.reg { color: red; }
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
	
	let breakpoints = {};
	
	let codeContainer = el("div").adto(container);
	lines.push({liel: el("div"), action: "nop"});
	for(let line of [...props.text.text.split("\n"), ""]) {
		let liel = el("div").adto(codeContainer).clss(".codeline");
		let lineno = lines.length;
		let [lnoSpaces, lnoNum] = lineno.toString().padStart(5, " ").split(/ (?=[^ ])/);
		let linenoBtn = el("button").clss(".lineno").atxt(lnoSpaces).adch(el("span").atxt(lnoNum).clss(".number")).adto(liel)
		.onev("click", () => {
			breakpoints["" + lineno] = !breakpoints["" + lineno];
			let isbp = breakpoints["" + lineno];
			linenoBtn.classList.toggle("breakpoint", isbp);
		});
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
			jumpPoints[name] = lineno; 
			continue;
		}
		let split = line.split(" ");
		let sp0 = split.shift();
		colr("instr", sp0 + " ").adto(liel).attr({title: docs[sp0] || "no documentation"});
		// it might be possible to automate this mostly
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
		}else if(sp0 === "sleep") {
			let [duration] = split;
			lines.push({liel, action: "sleep", duration});
			liel.adch(qcol(split, "reg"));
		}else{
			liel.classList.add("todo");
			colr("", split.join(" ")).adto(liel);
			linenoBtn.remove();
		}
	}
	
	// zig would make it possible for there to be an arg that forces this to be noasync
	let runInstructionInternal = async data => {
		let instr = data.lines[data.registers.ip];
		data.registers.ip += 1;
		
		let viewedRegisters = [];
		let setRegisters = [];
		
		let getReg = (reg) => {let sr1 = reg.substr(1); viewedRegisters.push(sr1); return data.registers[sr1];};
		let setReg = (reg, v) => {let sr1 = reg.substr(1); setRegisters.push(sr1); data.registers[sr1] = v;};
		
		if(!data.lines[data.registers.ip + 1]) return {viewedRegisters, setRegisters};
		
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
			setReg(instr.out, data.fetches.memo("random", () =>
				Math.floor(Math.random() * (high - low)) + low
			));
		}else if(instr.action === "add") {
			setReg(instr.out, getReg(instr.one) + getReg(instr.two));
		}else if(instr.action === "input") {
			let v = data.fetches.memo("input", () => {
				let res;
				do {
					res = +prompt("");
				} while (isNaN(res))
				return res;
			});
			setReg(instr.reg, v);
		}else if(instr.action === "goto") {
			let mark = instr.mark.substr(1);
			if(!(mark in jumpPoints)) {
				alert("No label :"+mark);
			}
			let jumpPoint = jumpPoints[mark];
			setReg("$ip", jumpPoint);
		}else if(instr.action === "sleep") {
			let duration = getReg(instr.duration);
			await data.fetches.fetch("sleep", () => new Promise(r => setTimeout(r, duration * 1000)));
		}else throw new Error("Unsupported "+instr.action);
		
		return {viewedRegisters, setRegisters};
	}
	
	let runInstruction = async data => {
		data.simCount.count += 1;
		try {
			return await runInstructionInternal(data);
		}catch(e) {
			if(e === "INSTRUCTION CANCELLED") {
				data.simCount.count -= 1;
				throw e;
			}
			else {console.log(e); alert("Error! "+e);}
		}
	};
	
	let initSimulation = (fetches) => {
		let registers = {...defaultRegisters};
		let simCount = {count: 0};
		return {fetches, registers, lines, simCount};
	}
	
	let mkFetches = () => {
		let current = 0;
		let saved = [];
		let stopAction = () => {};
		let fetches = {
			stop() {
				stopAction();
			},
			async fetch(mode, fallback) {
				let c = current;
				current += 1;
				if(saved[c]) {
					if(saved[c].mode !== mode) throw new Error("impurity");
					return saved[c].data;
				}else{
					let didStop = false;
					let tsa = () => {
						didStop = true;
					};
					stopAction = () => {tsa();}
					let data = await fallback((stopAction) => tsa = stopAction);
					stopAction = () => {};
					if(didStop) throw "INSTRUCTION CANCELLED";
					saved.push({mode, data});
					return data;
				}
			},
			memo(mode, fallback) {
				let c = current;
				current += 1;
				if(saved[c]) {
					if(saved[c].mode !== mode) throw new Error("impurity");
					return saved[c].data;
				}else{
					let data = fallback();
					saved.push({mode, data});
					return data;
				}
			},
			trim() {
				saved = saved.filter((_, i) => i < current);
			},
			reset() {
				current = 0;
			},
			clear() {
				fetches.reset();
				fetches.trim();
			},
		};
		return fetches;
	};
	let fetches = mkFetches();
	
	let executing = undefined;
	let onexec = [];
	let unhl = (sim) => {
		let instr = sim.lines[sim.registers.ip];
		executing && executing.liel.classList.remove("executing");
		executing = instr;
		onexec.forEach(oe => oe());
		instr.liel.classList.remove("next");
		instr.liel.classList.add("executing");
	};
	let rehl = (sim, updReg = {viewedRegisters: [], setRegisters: []}) => {
		executing && executing.liel.classList.remove("executing");
		executing = undefined;
		onexec.forEach(oe => oe());
		let instr = sim.lines[sim.registers.ip];
		instr.liel.classList.add("next");
		
		for(let regName of visibleRegs) {
			let rgdisp = regsDisplay[regName];
			let ntxt = sim.registers[regName].toString().padStart(3, " ");
			rgdisp.text.nodeValue = ntxt;
			rgdisp.reg.classList.toggle("viewed", updReg.viewedRegisters.includes(regName));
			rgdisp.reg.classList.toggle("edited", updReg.setRegisters.includes(regName));
		}
	}
	
	let sim = initSimulation(fetches);
	rehl(sim);
	let reset = async e => {
		e.stopPropagation();
		
		unhl(sim);
		if(executing) {
			fetches.stop(); // stop = () => defer.cleanup()
		}
		fetches.clear();
		sim = initSimulation(fetches);
		rehl(sim);
	};
	let backup = async e => {
		e.stopPropagation();
		
		unhl(sim);
		if(executing) {
			fetches.stop(); // stop = () => defer.cleanup()
		}
		let nsc = Math.max(sim.simCount.count - 1, 0);
		fetches.reset();
		sim = initSimulation(fetches);
		let lst;
		while(sim.simCount.count < nsc) lst = await runInstruction(sim);
		fetches.trim();
		rehl(sim, lst);
	};
	let advance = async e => {
		if(executing) return;
		e.stopPropagation();
		
		unhl(sim);
		let updReg = await runInstruction(sim);
		rehl(sim, updReg);
	};
	let play = fast => async e => {
		if(executing) return;
		e.stopPropagation();
		
		let luReg;
		while(sim.registers.ip < lines.length - 1) {
			unhl(sim);
			luReg = await runInstruction(sim);
			rehl(sim, luReg);
			if(breakpoints["" + sim.registers.ip]) break;
			if(!fast) await new Promise(r => setTimeout(r, 10));
		}
	}
	let disabledOnExec = btn => onexec.push(() => btn.disabled = !!executing);
	el("button").atxt("restart").adto(buttonArea).onev("click", reset);
	el("button").atxt("<-").adto(buttonArea).onev("click", backup);
	el("button").atxt("->").adto(buttonArea).onev("click", advance).dwth(disabledOnExec);
	el("button").atxt("run").adto(buttonArea).onev("click", play(false)).dwth(disabledOnExec);
	el("button").atxt("run (fast)").adto(buttonArea).onev("click", play(true)).dwth(disabledOnExec);
	
	let kdevl = k => {
		if(k.code === "ArrowRight") advance(k);
		if(k.code === "ArrowLeft") backup(k);
	}
	document.addEventListener("keydown", kdevl);
	defer(() => document.removeEventListener("keydown", kdevl));
	
	// runInstruction({fetches, registers, lines, simCount})
	
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