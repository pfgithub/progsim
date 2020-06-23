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
h3 {
	font-family: sans-serif;
	margin-top: 25px;
	margin-bottom: 10px;
}
.hidden {display: none;}
body > * {
	flex-shrink: 0;
}
input {
	border: 0;
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
	position: sticky;
	top: 0;
	background-color: white;
}
.codeline {
	padding-right: 25px;
}
.documentation {
	margin: 20px;
	margin-top: 0;
}
.ilasmrun .code {
	margin: 10px;
	padding-top: 10px;
	padding-bottom: 10px;
	background-color: #eee;
	border-radius: 10px;
	width: max-content;
}
.ilasmrun .executioninfo {
	border-bottom: 0;
	position: static;
}
.executioninfo {
	position: sticky;
	top: 34px;
	background-color: white;
	padding: 3px;
	border-bottom: 1px solid #000;
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
.regdisp.viewed { background-color: #afa; }
.regdisp.edited { background-color: #acf; }
.regdisp.viewed.edited { background: linear-gradient(to top, #afa, #acf); }
.hlitem.label { font-weight: bold; }
.hlitem.instr { color: blue; }
.hlitem.reg { color: red; }
.hlitem.immediate { color: green; }
.hlitem.error { color: red; font-style: italic; }
`.trim();
let defaultCode = `
set $r0 <- 5
set $r1 <- 6
add $r2 <- $r0 + $r1

goto :test
set $r0 <- 1
add $r0 <- $r0 + $r1
test:
set $r1 <- 15
add $r2 <- $r0 + $r1


set $r0 <- 2
sleep $r0


# guess the number game

set $r1 <- 1
set $r2 <- 100
random $r0 <- $r1 to $r2


input $r1
`.trim();

let docs = {
	set: {
		title: "set $reg ← #. sets the value in the register $reg to #.",
		example: `set $r0 <- 5\n# $r0 is now 5`,
		hl: ["reg", "", "immediate"],
		names: ["reg", "", "val"],
	},
	add: {
		title: "add $out ← $one + $two. sets the value in the register $out to $one plus $two.",
		example: `set $r0 <- 2\nset $r1 <- 4\nadd $r0 <- $r1 + $r0\n# $r0 is now 6`,
		hl: ["reg", "", "reg", "", "reg"],
		names: ["out", "", "one", "", "two"],
	},
	goto: {
		title: "goto :label. after this instruction, instead of running the next instruction, continue at :label",
		example: `set $r0 <- 5\ngoto :skip\nset $r0 <- 10\nskip:\n# $r0 is still 5`,
		hl: ["label"],
		names: ["mark"],
	},
	random: {
		title: "random $out ← $low to $high. set $out to a random number from $low to $high.",
		example: `set $r0 <- 5\nset $r1 <- 10\nrandom $r2 <- $r0 to $r1\n# $r2 is now a random number from 5 to 10`,
		hl: ["reg", "", "reg", "", "reg"],
		names: ["out", "", "low", "", "high"],
	},
	sleep: {
		title: "sleep $time. wait $time miliseconds before continuing to the next instruction. 1000ms = 1 sec",
		example: `set $r0 <- 1000\nsleep $r0\n# 1 second later...`,
		hl: ["reg"],
		names: ["duration"],
	},
	if: {
		title: "if $left <=> $right goto :label. if the condition is met, instead of continuing to the next instruction, continue at :label",
		example: `set $r0 <- 12\ninput $r1\nif $r1 > $r0 goto :nope\nalert "your number is <= 12"\nnope:`,
		hl: ["reg", "", "reg", "instr", "label"],
		names: ["condl", "cond", "condr", "", "label"],
	},
	input: {
		title: "input $out. asks the user for a number, and sets $out to the number.",
		example: `input $r0\n# $r0 now contains the number you typed`,
		hl: ["reg"],
		names: ["reg"],
	},
};

/// does not handle syntax errors (usually)
/// syntax errors will have italic red text at the
/// end stating the error
function parseAndSyntxHl(line) {
	let respan = el("span");
	
	if(!line.trim()) {
		return respan.atxt("          ");
	} else if(line.endsWith(":")) {
		return respan.adch(colr("label", line));
	} else if(line.startsWith("#")) {
		return respan.adch(colr("comment", line));
	}
	
	let lsplit = line.split(" ");
	let instr = lsplit.shift();
	let doc = docs[instr];
	if(!doc) {
		return respan.atxt(line);
	}
	
	return respan.adch(colr("instr", instr).attr({title: doc.title})).atxt(" ").adch(qcol(lsplit, ...doc.hl));
}

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

let colr = (color, txt) => el("span").attr({class: "hlitem "+color}).atxt(txt.replace(/<-/g, "←"));
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
	
	let executionInfo = el("div").clss("executioninfo").adto(container);
	
	let regsArea = el("div").clss("registers").adto(executionInfo);
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
	
	let buttonArea = el("div").clss("buttons").adto(executionInfo);
	
	let breakpoints = {};
	
	let codeContainer = el("div").clss("code").adto(container);
	lines.push({liel: el("div"), action: "nop"});
	[...props.text.text.split("\n")].forEach((line, i) => {
		let liel = el("div").adto(codeContainer).clss(".codeline");
		let lineno = lines.length;
		let [lnoSpaces, lnoNum] = lineno.toString().padStart(5, " ").split(/ (?=[^ ])/);
		let lnoNumSpan = el("span").atxt(lnoNum).clss(".number");
		let isLine = true;
		let linenoBtn = el("button").clss(".lineno").atxt(lnoSpaces).adch(lnoNumSpan).adto(liel)
		.onev("click", e => {
			e.stopPropagation();
			if(!isLine) return;
			breakpoints["" + lineno] = !breakpoints["" + lineno];
			let isbp = breakpoints["" + lineno];
			linenoBtn.classList.toggle("breakpoint", isbp);
		})
		.onev("dblclick", e => {
			e.stopPropagation();
			play(true, lineno)(e);
		}, true);
		let noline = () => {
			lnoNumSpan.remove();
			linenoBtn.atxt(" ".repeat(lnoNum.length));
			isLine = false;
		}
		let ltxt = el("span").adto(liel);
		let linp = el("span").adto(liel);
		ltxt.onev("dblclick", e => {
			ltxt.classList.add("hidden");
			let save = () => {
				// ltxt.classList.remove("hidden");
				// input.remove();
				let lsplits = props.text.text.split("\n");
				if(i > lsplits.length - 1) lsplits.push("");
				lsplits[i] = input.value;
				props.text.text = lsplits.join("\n");
				props.run("asm");
			};
			let input = el("input").adto(linp)
				.dwth(v => v.value = line)
				.dwth(v => v.focus())
				.dwth(v => v.select())
				.onev("blur", save)
				.onev("keydown", k => {
					k.stopPropagation();
					if(k.code === "Enter") {k.preventDefault(); k.stopPropagation(); save();}
				});
		});
		parseAndSyntxHl(line).adto(ltxt);
		if(!line.trim()) {
			lines.push({liel, action: "nop"}); return;
		}else if(line.startsWith("#")) {
			lines.push({liel, action: "nop"}); return;
		}else if(line.endsWith(":")) {
			lines.push({liel, action: "nop"});
			let name = line.substr(0, line.length - 1);
			jumpPoints[name] = lineno;
			return;
		}
		let split = line.split(" ");
		let sp0 = split.shift();
		let doc = docs[sp0];
		if(!doc) {
			ltxt.adch(colr("error", " Error: Instruction "));
			ltxt.adch(colr("instr", sp0));
			ltxt.adch(colr("error", " not found. Check the instructions tab for a list of instructions."));
			return noline();
		}
		let res = {};
		doc.names.forEach((name, i) => {
			res[name] = split[i];
		});
		if(split.length !== doc.names.length) {
			ltxt.adch(colr("error", " Error: Instruction "));
			ltxt.adch(colr("instr", sp0));
			ltxt.adch(colr("error", " has the wrong number of arguments. Check the instructions tab for examples."));
			return noline();
		}
		lines.push({liel, action: sp0, ...res});
	});
	lines.push({liel: el("div"), action: "nop"});
	
	// zig would make it possible for there to be an arg that forces this to be noasync
	let runInstructionInternal = async data => {
		let instr = data.lines[data.registers.ip];
		data.registers.ip += 1;
		
		let viewedRegisters = [];
		let setRegisters = [];
		
		let getReg = (reg) => {let sr1 = reg.substr(1); viewedRegisters.push(sr1); return data.registers[sr1];};
		let setReg = (reg, v) => {let sr1 = reg.substr(1); setRegisters.push(sr1); data.registers[sr1] = v;};
		
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
			}else{
				let jumpPoint = jumpPoints[mark];
				setReg("$ip", jumpPoint);
			}
		}else if(instr.action === "sleep") {
			let duration = getReg(instr.duration);
			await data.fetches.fetch("sleep", () => new Promise(r => setTimeout(r, duration)));
		}else if(instr.action === "if") {
			let condl = getReg(instr.condl);
			let condr = getReg(instr.condr);
			let cond = {
				["="]: (a, b) => a == b,
				["=="]: (a, b) => a == b,
				["≠"]: (a, b) => a != b,
				["!="]: (a, b) => a != b,
				["<"]: (a, b) => a < b,
				["≤"]: (a, b) => a <= b,
				["<="]: (a, b) => a <= b,
				[">="]: (a, b) => a >= b,
				["≥"]: (a, b) => a >= b,
				[">"]: (a, b) => a > b,
			}[instr.cond];
			
			let mark = instr.label.substr(1);
			if(!cond) alert("Must be = < <= > >= !=")
			else if(!(mark in jumpPoints)) {
				alert("No label :"+mark);
			}else if(cond(condl, condr)){
				let jumpPoint = jumpPoints[mark];
				setReg("$ip", jumpPoint);
			}
		}else alert("Unsupported "+instr.action);
		
		return {viewedRegisters, setRegisters};
	}
	
	let runInstruction = async data => {
		if(!data.lines[data.registers.ip + 1]) return;
		let instr = data.lines[data.registers.ip];
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
		let fetches = {
			stop() {
				fetches.stopAction();
			},
			stopAction: () => {},
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
					fetches.stopAction = () => {tsa();}
					let data = await fallback((stopAction) => tsa = stopAction);
					fetches.stopAction = () => {};
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
	let stop = async e => {
		e.stopPropagation();
		
		unhl(sim);
		if(executing) {
			fetches.stop(); // stop = () => defer.cleanup()
		}
		rehl(sim);
	};
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
	// if we do add memory, this could be done by saving previous memory states (undos, not the full state)
	// and previous register states and going back one instead of restarting from the beginning
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
	let play = (fast, stopOnlyAt = -1) => async e => {
		if(executing) return;
		e.stopPropagation();
		
		let luReg;
		let lastDelay = new Date().getTime();
		while(sim.registers.ip < lines.length - 1) {
			let stopRequested = false;
			unhl(sim);
			fetches.stopAction = () => stopRequested = true;
			luReg = await runInstruction(sim);
			fetches.stopAction = () => stopRequested = true;
			let now = new Date().getTime();
			if(!fast || now - lastDelay > 20) {
				await new Promise(r => window.requestAnimationFrame(r));
				lastDelay = now;
			}
			fetches.stopAction = () => {};
			rehl(sim, luReg);
			if(stopRequested) break;
			if(stopOnlyAt === -1){
				if(breakpoints["" + sim.registers.ip]) break;
			}else if(sim.registers.ip === stopOnlyAt) break;
		}
	}
	let disabledOnExec = btn => onexec.push(() => btn.disabled = !!executing);
	el("button").atxt("restart").adto(buttonArea).onev("click", reset);
	el("button").atxt("<-").adto(buttonArea).onev("click", backup);
	el("button").atxt("->").adto(buttonArea).onev("click", advance).dwth(disabledOnExec);
	el("button").atxt("pause").adto(buttonArea).onev("click", stop);
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

function DocumentationView(parent, props) {
	let defer = makeDefer();
	let container = el("div").adto(parent).clss("documentation").drmv(defer);
	defer(() => container.remove());
	
	for(let [name, doc] of Object.entries(docs)) {
		el("h3").atxt(name).adto(container);
		el("p").atxt(doc.title).adto(container);
		let egarea = el("div").adto(container);
		
		if(doc.example) {
			let text = {text: doc.example};
			let mkarv = () => AsmRunnerView(el("div").clss("ilasmrun")
				.adto(egarea), {text, run: () => {asmRunner.remove(); asmRunner = mkarv();}});
			let asmRunner = mkarv();
			defer(() => asmRunner.remove());
		}
	}
	
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
		localStorage.setItem("code", text.text);
		cev && cev.remove();
		btns[active] && btns[active].classList.remove("active");
		active = name;
		btns[active] && btns[active].classList.add("active");
		if(name === "code") {
			cev = CodeEditorView(parent, {text, run});
		}else if(name === "asm") {
			cev = AsmRunnerView(parent, {text, run});
		}else if(name === "docs") {
			cev = DocumentationView(parent, {text, run});
		}
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