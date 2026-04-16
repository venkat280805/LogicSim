/**
 * LogicSim EDU | Educational Logic Diagrams Simulator
 * Enhanced Engine v3.8 - FIXED INITIALIZATION & STATE
 */

const state = {
    currentMode: 'gates',
    activeModule: 'Combinational', // Track category
    inputs: {
        A: false, B: false, Cin: false, I0: false, I1: false, S: false, D: false, 
        serialIn: false, gateType: 'AND',
        regInputs: [false, false, false, false]
    },
    register: [0, 0, 0, 0],
    sequential: {
        Q: false, prevQ: false, count: 0,
        scanChain: [0, 0, 0],
        activeScanIndex: -1
    },
    mbist: {
        memory: [0, 0, 0, 0],
        written: [0, 0, 0, 0],
        read: [0, 0, 0, 0],
        status: 'IDLE',
        accessIndex: -1
    }
};

// Elements will be populated after DOM is ready
let elements = {};

const TRUTH_TABLES = {
    gates: (type) => ({ headers: ['A', 'B', 'OUT'], rows: [[0,0,calcGate(0,0,type)],[0,1,calcGate(0,1,type)],[1,0,calcGate(1,0,type)],[1,1,calcGate(1,1,type)]] }),
    'half-adder': () => ({ headers: ['A', 'B', 'SUM', 'CARRY'], rows: [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]] }),
    'full-adder': () => ({ headers: ['A', 'B', 'Cin', 'SUM', 'Cout'], rows: [[0,0,0,0,0],[1,1,1,1,1]] }),
    mux: () => ({ headers: ['I0', 'I1', 'S', 'OUT'], rows: [[1,0,0,1],[0,1,1,1]] }),
    decoder: () => ({ headers: ['A', 'B', 'Y0', 'Y1', 'Y2', 'Y3'], rows: [[0,0,1,0,0,0],[1,1,0,0,0,1]] }),
    'd-flip-flop': () => ({ headers: ['D', 'CLK', 'Q'], rows: [[1,'↑',1],[0,'↑',0]] }),
    counter: () => ({ headers: ['CLK', 'Count'], rows: [['↑',0],['↑',1],['↑',2],['↑',3]] }),
    'scan-chain': () => ({ headers: ['Input', 'FF1', 'FF2', 'FF3', 'Output'], rows: [[1,1,0,0,0],[0,0,1,0,0]] }),
    mbist: () => ({ headers: ['Step', 'Action', 'Result'], rows: [[1,'Write','Saved'],[2,'Read','Value'],[3,'Check','PASS/FAIL']] }),
    register: () => ({ headers: ['Inputs', 'Load', 'Stored'], rows: [['1010', 'Click', '1010']] })
};

/**
 * INITIALIZATION ENGINE
 * This ensures all DOM elements are found BEFORE attaching listeners.
 */
function init() {
    console.log("LogicSim EDU: Initializing...");

    // 1. Re-select all elements after DOM load
    elements = {
        navItems: document.querySelectorAll('.nav-item'),
        modeTitle: document.getElementById('current-mode-title'),
        modeBreadcrumb: document.getElementById('mode-breadcrumb'),
        simContainer: document.getElementById('simulation-container'),
        stepsContent: document.getElementById('steps-content'),
        truthTable: document.getElementById('truth-table'),
        explanation: document.getElementById('explanation-content'),
        adderParent: document.getElementById('adder-parent')
    };

    // 2. Attach Sidebar Listeners
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const mode = item.getAttribute('data-mode');
            if (mode) switchMode(mode);
        });
    });

    // 3. Adder Parent Default-to-Half Logic
    if (elements.adderParent) {
        elements.adderParent.addEventListener('click', () => {
            // Give details a tiny moment to process the click
            setTimeout(() => {
                const details = elements.adderParent.parentElement;
                if (details && details.open) {
                    // Force rendering of Half Adder if we are just opening
                    switchMode('half-adder');
                }
            }, 10);
        });
    }

    // 4. Set Initial State (Default: Gates)
    switchMode('gates');
    
    console.log("LogicSim EDU: Ready.");
}

/**
 * CORE STATE SWITCHER
 */
function switchMode(mode) {
    if (!mode) return;
    
    state.currentMode = mode;
    console.log(`Switching to: ${mode}`);
    
    // Highlight sidebar
    elements.navItems.forEach(item => {
        const itemMode = item.getAttribute('data-mode');
        if (itemMode === mode) {
            item.classList.add('active');
            // Extract the section name from the summary of the parent details
            const section = item.closest('.nav-section');
            if (section) {
                const category = section.querySelector('.nav-category');
                if (category) state.activeModule = category.textContent;
            }
        } else {
            item.classList.remove('active');
        }
    });

    // Update Headings & Breadcrumbs
    const friendlyName = getFriendlyName(mode);
    if (elements.modeTitle) elements.modeTitle.textContent = friendlyName;
    if (elements.modeBreadcrumb) {
        elements.modeBreadcrumb.textContent = `${state.activeModule} > ${friendlyName}`;
    }

    // Full Re-render
    renderSimulation();
    updateLogic();
    renderTruthTable();
}

function getFriendlyName(m) {
    return {
        'gates': 'Logic Gates', 'half-adder': 'Half Adder', 'full-adder': 'Full Adder', 
        'mux': 'Multiplexer', 'decoder': 'Decoder', 'd-flip-flop': 'Flip-Flop', 
        'counter': 'Counter', 'scan-chain': 'Scan Chain', 'mbist': 'MBIST',
        'register': 'Register'
    }[m] || m;
}

function calcGate(a, b, t) {
    switch (t) {
        case 'AND': return a && b; case 'OR': return a || b; case 'NOT': return !a;
        case 'NAND': return !(a && b); case 'NOR': return !(a || b); default: return false;
    }
}

function updateLogic() {
    if (!elements.simContainer) return;
    
    const { inputs, currentMode } = state;
    let outputs = {}; let steps = [];

    switch (currentMode) {
        case 'gates':
            const gateRes = calcGate(inputs.A, inputs.B, inputs.gateType);
            outputs['OUT'] = gateRes;
            steps = [`Input A is ${inputs.A?1:0}`, `Input B is ${inputs.B?1:0}`, `Output result is ${gateRes?1:0}`];
            break;
        case 'half-adder':
            outputs = { SUM: inputs.A^inputs.B, CARRY: inputs.A&&inputs.B };
            steps = [`Sum Bit: ${outputs.SUM}`, `Carry Bit: ${outputs.CARRY}`];
            break;
        case 'full-adder':
            const axorb = inputs.A^inputs.B;
            outputs = { SUM: axorb^inputs.Cin, CARRY: (inputs.A&&inputs.B)||(inputs.Cin&&axorb) };
            steps = [`XOR stage: ${axorb?1:0}`, `Final Sum: ${outputs.SUM}`, `Final Carry: ${outputs.CARRY}`];
            break;
        case 'mux':
            outputs['OUT'] = inputs.S ? inputs.I1 : inputs.I0;
            steps = [`Selected S: ${inputs.S?1:0}`, `Choice: I${inputs.S?1:0}`, `Result: ${outputs.OUT?1:0}`];
            break;
        case 'decoder':
            const r = (inputs.A?2:0)+(inputs.B?1:0);
            for(let i=0; i<4; i++) outputs[`Y${i}`] = (r===i);
            steps = [`Binary: ${inputs.A?1:0}${inputs.B?1:0}`, `Selection: Y${r}`];
            break;
        case 'd-flip-flop':
            outputs['Q'] = state.sequential.Q;
            steps = [`Entering Data: ${inputs.D?1:0}`, `Current Storage: ${outputs.Q?1:0}`];
            break;
        case 'counter':
            outputs['Q0'] = state.sequential.count & 1; outputs['Q1'] = (state.sequential.count >> 1) & 1;
            steps = [`Number: ${state.sequential.count}`, `Bits: ${outputs.Q1}${outputs.Q0}`];
            const d = document.getElementById('count-dec'); if(d) d.textContent = state.sequential.count;
            break;
        case 'register':
            steps = [`Inputs: ${inputs.regInputs.map(b=>b?1:0).join('')}`, `Stored: ${state.register.join('')}`];
            renderRegister();
            break;
        case 'scan-chain':
            steps = [`Serial Input: ${inputs.serialIn?1:0}`, `State: [${state.sequential.scanChain.join('][')}]`, `Last Bit: ${state.sequential.scanChain[state.sequential.scanChain.length-1]}`];
            renderScanChain();
            break;
        case 'mbist':
            steps = [`Data: [${state.mbist.memory.join('')}]`, `Status: ${state.mbist.status}`];
            renderMBIST();
            break;
    }

    Object.keys(outputs).forEach(id => updateIndicator(id, outputs[id]));
    renderSteps(steps);
    updateExplanation();
    highlightTruthTableRow();
    
    const diag = document.getElementById('diagram-viewport');
    if (diag && !['register','scan-chain','mbist'].includes(currentMode)) {
        diag.innerHTML = getDiagramSVG(currentMode);
    }
}

function renderSimulation() {
    let html = ''; const mode = state.currentMode;
    const layout = (ins, diag, outs) => `<div class="simulator-layout"><div class="inputs-group">${ins}</div><div id="diagram-viewport" style="flex:1">${diag}</div><div class="outputs-group">${outs}</div></div>`;

    if (mode === 'register') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:1.5rem;">
                <div class="helper-label">Stores multiple bits of data</div>
                <div class="inputs-group" style="flex-direction:row; gap:10px; justify-content:center; width:100%;">
                    ${[0,1,2,3].map(i => renderSwitch(`reg-${i}`, `D${i}`)).join('')}
                    <button class="pulse-btn" id="reg-load-btn" style="margin-left:20px;">Load Data</button>
                </div>
                <div id="register-container" class="scan-flow"></div>
            </div>
        `;
    } else if (mode === 'scan-chain') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:1.5rem;">
                <div class="helper-label">Shifts data bit-by-bit</div>
                <div class="inputs-group" style="flex-direction:row; gap:20px; justify-content:center; width:100%;">
                    ${renderSwitch('serialIn', 'Data In')}
                    <button class="pulse-btn" id="shift-in-btn">Shift-In (Move Data)</button>
                </div>
                <div id="scan-container" class="scan-flow"></div>
                <div class="outputs-group" style="flex-direction:row; justify-content:center;">${renderIndicator('serialOut', 'Out Bit')}</div>
            </div>
        `;
    } else if (mode === 'mbist') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:1rem;">
                <div class="helper-label">Tests memory for errors</div>
                <div class="inputs-group" style="flex-direction:row; gap:10px; justify-content:center; width:100%;">
                    <button class="pulse-btn" id="mbist-write">1. Write</button>
                    <button class="pulse-btn" id="mbist-read">2. Read</button>
                    <button class="pulse-btn" id="mbist-compare">3. Compare</button>
                </div>
                <div id="mbist-grid" class="memory-grid" style="grid-template-columns: repeat(4, 75px); justify-content:center;"></div>
                <div id="mbist-results" style="text-align:center; font-weight:800; font-size:1.1rem; min-height:1.2rem;"></div>
            </div>
        `;
    } else {
        const ins = mode==='gates'?`<select class="gate-select" id="gate-type-select"><option value="AND">AND Gate</option><option value="OR">OR Gate</option><option value="NOT">NOT Gate</option><option value="NAND">NAND Gate</option><option value="NOR">NOR Gate</option></select>`+renderSwitch('A','A')+`<div id="input-b-container">${renderSwitch('B','B')}</div>` :
                    mode==='half-adder'?renderSwitch('A','A')+renderSwitch('B','B') :
                    mode==='full-adder'?renderSwitch('A','A')+renderSwitch('B','B')+renderSwitch('Cin','Cin') :
                    mode==='mux'?renderSwitch('I0','I0')+renderSwitch('I1','I1')+renderSwitch('S','Sel') :
                    mode==='decoder'?renderSwitch('A','A')+renderSwitch('B','B') :
                    mode==='d-flip-flop'?renderSwitch('D','Data')+`<button class="pulse-btn" id="clock-pulse">Save</button>` :
                    mode==='counter'?`<button class="pulse-btn" id="counter-pulse">Next</button>` : '';
        const outs = mode==='decoder'?renderIndicator('Y0','Y0')+renderIndicator('Y1','Y1')+renderIndicator('Y2','Y2')+renderIndicator('Y3','Y3') :
                     mode==='half-adder'||mode==='full-adder'?renderIndicator('SUM','Sum')+renderIndicator('CARRY','Carry') :
                     mode==='counter'?renderIndicator('Q1','Q1')+renderIndicator('Q0','Q0') : renderIndicator('OUT','Out');
        html = layout(ins, getDiagramSVG(mode), outs);
    }
    
    if (elements.simContainer) {
        elements.simContainer.innerHTML = html;
        attachEvents();
    }
}

function renderSwitch(id, label) { return `<div class="switch-container"><span class="switch-label">${label}</span><label class="switch"><input type="checkbox" id="input-${id}" ${state.inputs[id] ? 'checked' : ''}><span class="slider"></span></label></div>`; }
function renderIndicator(id, label) { return `<div class="switch-container"><span class="switch-label">${label}</span><div id="indicator-${id}" class="indicator">0</div></div>`; }

function renderRegister() {
    const container = document.getElementById('register-container');
    if (container) container.innerHTML = state.register.map((val, i) => `<div class="ff-block"><span class="ff-label">Q${i}</span><div class="ff-val">${val}</div></div>`).join('');
}

function renderScanChain() {
    const container = document.getElementById('scan-container');
    if (container) container.innerHTML = state.sequential.scanChain.map((val, i) => `<div class="ff-block ${state.sequential.activeScanIndex === i ? 'active' : ''}"><span class="ff-label">FF${i+1}</span><div class="ff-val">${val}</div></div>`).join('<div class="flow-arrow">→</div>');
}

function renderMBIST() {
    const grid = document.getElementById('mbist-grid');
    if (!grid) return;
    grid.innerHTML = state.mbist.memory.map((val, i) => `<div class="memory-cell ${state.mbist.accessIndex === i ? 'accessed' : ''}">${val}</div>`).join('');
    const res = document.getElementById('mbist-results');
    if (res) {
        let text = '';
        if (state.mbist.status === 'WRITTEN') text = `Pattern: ${state.mbist.written.join('')}`;
        else if (state.mbist.status === 'READ') text = `Read: ${state.mbist.read.join('')}`;
        else if (state.mbist.status === 'PASS') text = `<span style="color:var(--success)">TEST PASS ✓</span>`;
        else if (state.mbist.status === 'FAIL') text = `<span style="color:var(--danger)">TEST FAIL ✗</span>`;
        res.innerHTML = text;
    }
}

function getDiagramSVG(mode) {
    let svg = `<svg viewBox="0 0 300 120" class="diagram-container">`;
    const wire = (x1, y1, x2, y2, active) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wire ${active ? 'high' : ''}" />`;
    const label = (x, y, txt) => `<text x="${x}" y="${y}" class="gate-text">${txt}</text>`;
    if (mode === 'gates') {
        const type = state.inputs.gateType; const a = state.inputs.A; const b = state.inputs.B; const out = calcGate(a, b, type);
        svg += wire(20, 45, 100, 40, a); if (type !== 'NOT') svg += wire(20, 85, 100, 80, b);
        let path = (type==='OR'||type==='NOR'? 'M100,30 c10,0 20,10 20,30 c0,20 -10,30 -20,30 c20,0 50,-10 50,-30 c0,-20 -30,-30 -50,-30' : 
                   type==='NOT' ? 'M100,30 l50,30 l-50,30 z' : 'M100,30 h40 a30,30 0 0 1 0,60 h-40 z');
        svg += `<path d="${path}" class="gate-body ${out ? 'active' : ''}" />`;
        if(type==='NOT'||type.startsWith('NA')||type==='NOR') svg += `<circle cx="${type==='NOT'?157:177}" cy="60" r="5" class="gate-body" style="fill:white" />`;
        svg += wire(180, 60, 260, 60, out);
    } else {
        svg += `<rect x="100" y="25" width="100" height="70" rx="8" class="gate-body" />` + label(150, 65, mode.replace('-',' ').toUpperCase());
    }
    return svg + `</svg>`;
}

function attachEvents() {
    if (!elements.simContainer) return;
    elements.simContainer.querySelectorAll('input[type="checkbox"]').forEach(i => {
        i.addEventListener('change', e => { 
            const id = e.target.id.replace('input-', '');
            if (id.startsWith('reg-')) state.inputs.regInputs[parseInt(id.split('-')[1])] = e.target.checked;
            else state.inputs[id] = e.target.checked;
            updateLogic();
        });
    });
    const s = document.getElementById('gate-type-select');
    if (s) {
        s.value = state.inputs.gateType;
        s.addEventListener('change', e => { state.inputs.gateType = e.target.value; renderTruthTable(); updateLogic(); });
    }
    const regLoad = document.getElementById('reg-load-btn');
    if (regLoad) regLoad.addEventListener('click', () => { state.register = state.inputs.regInputs.map(v=>v?1:0); updateLogic(); });
    const clk = document.getElementById('clock-pulse');
    if (clk) clk.addEventListener('click', () => { state.sequential.Q = state.inputs.D; updateLogic(); });
    const cp = document.getElementById('counter-pulse');
    if (cp) cp.addEventListener('click', () => { state.sequential.count = (state.sequential.count+1)%4; updateLogic(); });
    const sIn = document.getElementById('shift-in-btn');
    if (sIn) sIn.addEventListener('click', () => {
        state.sequential.scanChain.unshift(state.inputs.serialIn?1:0);
        state.sequential.scanChain.pop();
        state.sequential.activeScanIndex = 0;
        updateLogic();
        setTimeout(() => { state.sequential.activeScanIndex = -1; updateLogic(); }, 200);
    });
    const mWrite = document.getElementById('mbist-write');
    if (mWrite) mWrite.addEventListener('click', () => { state.mbist.memory = [1,0,1,0]; state.mbist.written = [1,0,1,0]; state.mbist.status = 'WRITTEN'; updateLogic(); });
    const mRead = document.getElementById('mbist-read');
    if (mRead) mRead.addEventListener('click', () => { state.mbist.read = [...state.mbist.memory]; state.mbist.status = 'READ'; updateLogic(); });
    const mComp = document.getElementById('mbist-compare');
    if (mComp) mComp.addEventListener('click', () => { state.mbist.status = (JSON.stringify(state.mbist.written) === JSON.stringify(state.mbist.read)) ? 'PASS' : 'FAIL'; updateLogic(); });
}

function updateIndicator(id, val) { const el = document.getElementById(`indicator-${id}`); if (el) { el.classList.toggle('high', !!val); el.textContent = val ? '1' : '0'; } }
function renderSteps(s) { if(elements.stepsContent) elements.stepsContent.innerHTML = s.map((t, i) => `<div class="step-item ${i===s.length-1?'active':''}"><div class="step-title">Step ${i+1}</div><div class="step-value">${t}</div></div>`).join(''); }
function renderTruthTable() {
    const d = TRUTH_TABLES[state.currentMode](state.inputs.gateType);
    if(!d || !elements.truthTable) return;
    elements.truthTable.innerHTML = `<thead><tr>${d.headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>` + d.rows.map((r,i)=>`<tr id="row-${i}">${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') + `</tbody>`;
    highlightTruthTableRow();
}
function highlightTruthTableRow() {
    const m = state.currentMode; const i = state.inputs; let idx = -1;
    if (m==='gates') idx = (i.A?2:0)+(i.B?1:0);
    else if (m==='half-adder') idx = (i.A?2:0)+(i.B?1:0);
    else if (m==='mux') idx = i.S ? 1 : 0;
    if(!elements.truthTable) return;
    const active = elements.truthTable.querySelector(`#row-${idx}`);
    if (active) { elements.truthTable.querySelectorAll('tr').forEach(r=>r.classList.remove('highlight-row')); active.classList.add('highlight-row'); }
}
function updateExplanation() {
    const m = state.currentMode;
    const d = {
        'gates': 'A basic block that takes inputs and gives one result.',
        'half-adder': 'A circuit that adds 2 bits together.',
        'full-adder': 'A circuit that adds 3 bits, including a carry.',
        'mux': 'A selector that picks which input to send to the output.',
        'decoder': 'Turns a binary code into a single active signal.',
        'd-flip-flop': 'Remembers its input value when you click Save.',
        'counter': 'Counts up from 0 to 3 each time you click Next.',
        'register': 'A register is a group of flip-flops used to store multiple bits.',
        'scan-chain': 'In scan mode, flip-flops act like a shift register. Data moves one position at a time.',
        'mbist': 'MBIST writes data, reads it back, and compares it. If they match, it passes.'
    };
    if(elements.explanation) elements.explanation.innerHTML = `<p>${d[m] || ''}</p>`;
}

// Ensure DOM is ready before init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
