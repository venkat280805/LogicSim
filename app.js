/**
 * LogicSim Pro | Advanced Digital Logic Simulator Engine
 * Engine v4.0 - Premium Visuals & Dynamic SVG Architecture
 */

const state = {
    currentMode: 'gates',
    activeModule: 'Combinational',
    theme: 'light',
    clock: {
        active: false,
        interval: null,
        speed: 1000
    },
    inputs: {
        A: false, B: false, Cin: false, I0: false, I1: false, S: false, D: false, 
        serialIn: false, gateType: 'AND',
        regInputs: [false, false, false, false]
    },
    register: [0, 0, 0, 0],
    sequential: {
        Q: false, count: 0,
        scanChain: [0, 0, 0]
    },
    mbist: {
        memory: [0, 0, 0, 0],
        written: [0, 0, 0, 0],
        read: [0, 0, 0, 0],
        status: 'IDLE',
        accessIndex: -1
    }
};

let elements = {};

const TRUTH_TABLES = {
    gates: (type) => ({ 
        headers: ['A', 'B', 'OUT'], 
        rows: [[0,0,calcGate(0,0,type)],[0,1,calcGate(0,1,type)],[1,0,calcGate(1,0,type)],[1,1,calcGate(1,1,type)]] 
    }),
    'half-adder': () => ({ 
        headers: ['A', 'B', 'SUM', 'CARRY'], 
        rows: [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]] 
    }),
    'full-adder': () => ({ 
        headers: ['A', 'B', 'Cin', 'SUM', 'Cout'], 
        rows: [
            [0,0,0,0,0], [0,0,1,1,0], [0,1,0,1,0], [0,1,1,0,1],
            [1,0,0,1,0], [1,0,1,0,1], [1,1,0,0,1], [1,1,1,1,1]
        ] 
    }),
    mux: () => ({ 
        headers: ['I0', 'I1', 'S', 'OUT'], 
        rows: [[0,0,0,0],[0,1,0,0],[1,0,0,1],[1,1,0,1],[0,0,1,0],[0,1,1,1],[1,0,1,0],[1,1,1,1]] 
    }),
    decoder: () => ({ 
        headers: ['A', 'B', 'Y0', 'Y1', 'Y2', 'Y3'], 
        rows: [[0,0,1,0,0,0],[0,1,0,1,0,0],[1,0,0,0,1,0],[1,1,0,0,0,1]] 
    }),
    'd-flip-flop': () => ({ 
        headers: ['D', 'CLK', 'Q'], 
        rows: [[0,'↑',0],[1,'↑',1],[0,'-',0],[1,'-',1]] 
    }),
    counter: () => ({ 
        headers: ['Pulse', 'Q1', 'Q0', 'Decimal'], 
        rows: [[0,0,0,0],[1,0,1,1],[2,1,0,2],[3,1,1,3]] 
    }),
    'scan-chain': () => ({ 
        headers: ['SI', 'FF1', 'FF2', 'FF3', 'SO'], 
        rows: [[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]] 
    }),
    mbist: () => ({ 
        headers: ['Phase', 'Action', 'Memory'], 
        rows: [['Write','Patt','1010'],['Read','Load','1010'],['Check','Comp','PASS']] 
    }),
    register: () => ({ 
        headers: ['D3-D0', 'Load', 'Q3-Q0'], 
        rows: [['1010', '↑', '1010'], ['0110', '-', '1010']] 
    })
};

function init() {
    elements = {
        navItems: document.querySelectorAll('.nav-item'),
        modeTitle: document.getElementById('current-mode-title'),
        modeBreadcrumb: document.getElementById('mode-breadcrumb'),
        simContainer: document.getElementById('simulation-container'),
        stepsContent: document.getElementById('steps-content'),
        truthTable: document.getElementById('truth-table'),
        explanation: document.getElementById('explanation-content'),
        themeToggle: document.getElementById('theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        autoClock: document.getElementById('auto-clock-toggle'),
        clockSpeed: document.getElementById('clock-speed'),
        clockControls: document.getElementById('clock-controls')
    };

    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const mode = item.getAttribute('data-mode');
            if (mode) switchMode(mode);
        });
    });

    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.autoClock.addEventListener('change', toggleClock);
    elements.clockSpeed.addEventListener('change', (e) => {
        state.clock.speed = parseInt(e.target.value);
        if (state.clock.active) {
            toggleClock(); // Restart with new speed
            toggleClock();
        }
    });

    switchMode('gates');
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.body.className = `${state.theme}-theme`;
    elements.themeIcon.textContent = state.theme === 'light' ? '🌙' : '☀️';
}

function toggleClock() {
    state.clock.active = elements.autoClock.checked;
    if (state.clock.active) {
        state.clock.interval = setInterval(triggerClockStep, state.clock.speed);
    } else {
        clearInterval(state.clock.interval);
    }
}

function triggerClockStep() {
    const pulseBtn = document.querySelector('.pulse-btn');
    if (pulseBtn) {
        pulseBtn.classList.add('active');
        pulseBtn.click();
        setTimeout(() => pulseBtn.classList.remove('active'), 100);
    }
}

function switchMode(mode) {
    state.currentMode = mode;
    
    // UI Updates
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-mode') === mode);
        if (item.classList.contains('active')) {
            const category = item.closest('.nav-section').querySelector('.nav-category');
            state.activeModule = category.textContent;
        }
    });

    elements.modeTitle.textContent = getFriendlyName(mode);
    elements.modeBreadcrumb.textContent = `${state.activeModule} > ${getFriendlyName(mode)}`;
    
    // Show/Hide Clock Controls
    const isSequential = ['d-flip-flop', 'counter', 'scan-chain'].includes(mode);
    elements.clockControls.style.display = isSequential ? 'flex' : 'none';

    renderSimulation();
    updateLogic();
    renderTruthTable();
}

function getFriendlyName(m) {
    return {
        'gates': 'Logic Gates', 'half-adder': 'Half Adder', 'full-adder': 'Full Adder', 
        'mux': 'Multiplexer', 'decoder': 'Decoder', 'd-flip-flop': 'D Flip-Flop', 
        'counter': '2-Bit Counter', 'scan-chain': 'Scan Chain', 'mbist': 'MBIST Engine',
        'register': '4-Bit Register'
    }[m] || m;
}

function calcGate(a, b, t) {
    switch (t) {
        case 'AND': return a && b; case 'OR': return a || b; case 'NOT': return !a;
        case 'NAND': return !(a && b); case 'NOR': return !(a || b); default: return false;
    }
}

function updateLogic() {
    const { inputs, currentMode } = state;
    let outputs = {}; let steps = [];

    switch (currentMode) {
        case 'gates':
            const g = calcGate(inputs.A, inputs.B, inputs.gateType);
            outputs['OUT'] = g;
            steps = [`Input A is ${inputs.A?1:0}`, `Input B is ${inputs.B?1:0}`, `Gate ${inputs.gateType} result: ${g?1:0}`];
            break;
        case 'half-adder':
            outputs = { SUM: inputs.A^inputs.B, CARRY: inputs.A&&inputs.B };
            steps = [`A ⊕ B (XOR) = ${outputs.SUM}`, `A ⋅ B (AND) = ${outputs.CARRY}`];
            break;
        case 'full-adder':
            const x1 = inputs.A ^ inputs.B;
            outputs = { SUM: x1 ^ inputs.Cin, Cout: (inputs.A && inputs.B) || (inputs.Cin && x1) };
            steps = [`Internal Sum (A⊕B): ${x1?1:0}`, `Final Sum: ${outputs.SUM?1:0}`, `Carry Out: ${outputs.Cout?1:0}`];
            break;
        case 'mux':
            outputs['OUT'] = inputs.S ? inputs.I1 : inputs.I0;
            steps = [`Selector S is ${inputs.S?1:0}`, `Routing I${inputs.S?1:0} to Output`, `Result: ${outputs.OUT?1:0}`];
            break;
        case 'decoder':
            const r = (inputs.A?2:0)+(inputs.B?1:0);
            for(let i=0; i<4; i++) outputs[`Y${i}`] = (r===i);
            steps = [`Value bin(${inputs.A?1:0}${inputs.B?1:0}) = ${r}`, `Activating Output Y${r}`];
            break;
        case 'd-flip-flop':
            outputs['Q'] = state.sequential.Q;
            steps = [`D Input: ${inputs.D?1:0}`, `Master-Slave State: ${state.sequential.Q?1:0}`];
            break;
        case 'counter':
            outputs['Q0'] = state.sequential.count & 1; outputs['Q1'] = (state.sequential.count >> 1) & 1;
            steps = [`Current Count: ${state.sequential.count}`, `Binary state: ${outputs.Q1}${outputs.Q0}`];
            break;
        case 'register':
            state.register.forEach((v,i) => outputs[`Q${i}`] = v);
            steps = [`Stored Bits: ${state.register.join('')}`];
            renderRegister();
            break;
        case 'scan-chain':
            steps = [`SI: ${inputs.serialIn?1:0}`, `Chain: [${state.sequential.scanChain.join(']-[')}]` ];
            renderScanChain();
            break;
        case 'mbist':
            steps = [`Memory: [${state.mbist.memory.join('')}]`, `Status: ${state.mbist.status}`];
            renderMBIST();
            break;
    }

    Object.keys(outputs).forEach(id => updateIndicator(id, outputs[id]));
    renderSteps(steps);
    updateExplanation();
    highlightTruthTableRow();
    
    // Update SVG
    const diag = document.getElementById('diagram-viewport');
    if (diag) diag.innerHTML = getDiagramSVG(currentMode);
}

function renderSimulation() {
    let html = ''; const mode = state.currentMode;
    const layout = (ins, outs) => `<div class="simulator-layout"><div class="inputs-group">${ins}</div><div id="diagram-viewport" style="flex:1"></div><div class="outputs-group">${outs}</div></div>`;

    if (mode === 'register') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:2rem;">
                <div class="inputs-group" style="flex-direction:row; gap:12px; justify-content:center; width:100%;">
                    ${[3,2,1,0].map(i => renderSwitch(`reg-${i}`, `D${i}`)).join('')}
                    <button class="pulse-btn" id="reg-load-btn" style="margin-left:2rem;">Load Data</button>
                </div>
                <div id="register-container" class="scan-flow" style="display:flex; gap:15px; justify-content:center;"></div>
            </div>
        `;
    } else if (mode === 'scan-chain') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:2rem;">
                <div class="inputs-group" style="flex-direction:row; gap:2rem; justify-content:center; width:100%;">
                    ${renderSwitch('serialIn', 'SI')}
                    <button class="pulse-btn" id="shift-in-btn">Shift Internal</button>
                    ${renderIndicator('serialOut', 'SO')}
                </div>
                <div id="scan-container" class="scan-flow" style="display:flex; align-items:center; gap:20px; justify-content:center;"></div>
            </div>
        `;
    } else if (mode === 'mbist') {
        html = `
            <div class="simulator-layout" style="flex-direction:column; gap:1.5rem;">
                <div class="inputs-group" style="flex-direction:row; gap:15px; justify-content:center; width:100%;">
                    <button class="pulse-btn" id="mbist-write">1. Pattern Write</button>
                    <button class="pulse-btn secondary" id="mbist-read">2. Read & Cache</button>
                    <button class="pulse-btn secondary" id="mbist-compare">3. Verify Logic</button>
                </div>
                <div id="mbist-grid" class="memory-grid" style="grid-template-columns: repeat(4, 70px); justify-content:center;"></div>
                <div id="mbist-results" style="font-size:1.2rem; font-weight:800; min-height:2rem; text-align:center;"></div>
            </div>
        `;
    } else {
        const ins = mode==='gates'?`<select class="gate-select" id="gate-type-select"><option value="AND">AND GATE</option><option value="OR">OR GATE</option><option value="NOT">NOT GATE</option><option value="NAND">NAND GATE</option><option value="NOR">NOR GATE</option></select>`+renderSwitch('A','A')+`<div id="input-b-container">${renderSwitch('B','B')}</div>` :
                    mode==='half-adder'?renderSwitch('A','A')+renderSwitch('B','B') :
                    mode==='full-adder'?renderSwitch('A','A')+renderSwitch('B','B')+renderSwitch('Cin','Cin') :
                    mode==='mux'?renderSwitch('I0','I0')+renderSwitch('I1','I1')+renderSwitch('S','SEL') :
                    mode==='decoder'?renderSwitch('A','A')+renderSwitch('B','B') :
                    mode==='d-flip-flop'?renderSwitch('D','D')+`<button class="pulse-btn" id="clock-pulse">CAP</button>` :
                    mode==='counter'?`<button class="pulse-btn" id="counter-pulse">NEXT</button>` : '';
        const outs = mode==='decoder'?renderIndicator('Y0','Y0')+renderIndicator('Y1','Y1')+renderIndicator('Y2','Y2')+renderIndicator('Y3','Y3') :
                     mode==='half-adder'?renderIndicator('SUM','S')+renderIndicator('CARRY','C') :
                     mode==='full-adder'?renderIndicator('SUM','S')+renderIndicator('Cout','Co') :
                     mode==='counter'?renderIndicator('Q1','Q1')+renderIndicator('Q0','Q0') : renderIndicator('OUT','Q');
        html = layout(ins, outs);
    }
    
    elements.simContainer.innerHTML = html;
    attachEvents();
}

function renderSwitch(id, label) { 
    return `<div class="switch-container"><span class="switch-label">${label}</span><label class="switch"><input type="checkbox" id="input-${id}" ${state.inputs[id] ? 'checked' : ''}><span class="slider"></span></label></div>`; 
}

function renderIndicator(id, label) { 
    return `<div class="switch-container"><span class="switch-label">${label}</span><div id="indicator-${id}" class="indicator">0</div></div>`; 
}

function attachEvents() {
    elements.simContainer.querySelectorAll('input[type="checkbox"]').forEach(i => {
        i.addEventListener('change', e => { 
            const id = e.target.id.replace('input-', '');
            if (id.startsWith('reg-')) state.inputs.regInputs[parseInt(id.split('-')[1])] = e.target.checked;
            else state.inputs[id] = e.target.checked;
            updateLogic();
        });
    });

    const s = document.getElementById('gate-type-select');
    if (s) s.addEventListener('change', e => { state.inputs.gateType = e.target.value; renderTruthTable(); updateLogic(); });

    // Buttons
    const bindBtn = (id, fn) => { const b = document.getElementById(id); if(b) b.addEventListener('click', fn); };
    bindBtn('reg-load-btn', () => { state.register = [...state.inputs.regInputs].reverse().map(v=>v?1:0); updateLogic(); });
    bindBtn('clock-pulse', () => { state.sequential.Q = state.inputs.D; updateLogic(); });
    bindBtn('counter-pulse', () => { state.sequential.count = (state.sequential.count+1)%4; updateLogic(); });
    bindBtn('shift-in-btn', () => {
        state.sequential.scanChain.unshift(state.inputs.serialIn?1:0);
        state.sequential.scanChain.pop();
        updateLogic();
    });
    bindBtn('mbist-write', () => { state.mbist.memory = [1,0,1,0]; state.mbist.written = [1,0,1,0]; state.mbist.status = 'WRITTEN'; updateLogic(); });
    bindBtn('mbist-read', () => { state.mbist.read = [...state.mbist.memory]; state.mbist.status = 'READ'; updateLogic(); });
    bindBtn('mbist-compare', () => { state.mbist.status = (JSON.stringify(state.mbist.written) === JSON.stringify(state.mbist.read)) ? 'PASS' : 'FAIL'; updateLogic(); });
}

function getDiagramSVG(mode) {
    let svg = `<svg viewBox="0 0 400 160" class="diagram-container">`;
    const wire = (x1, y1, x2, y2, act) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wire ${act?'high':''}" />`;
    const rect = (x, y, w, h, act) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="gate-body ${act?'active':''}" />`;
    const text = (x, y, t) => `<text x="${x}" y="${y}" class="gate-text">${t}</text>`;

    if (mode === 'gates') {
        const t = state.inputs.gateType; const a = state.inputs.A; const b = state.inputs.B; const q = calcGate(a, b, t);
        svg += wire(20, 50, 150, 50, a); if (t !== 'NOT') svg += wire(20, 110, 150, 110, b);
        let path = (t==='OR'||t==='NOR'? 'M150,30 c20,0 40,15 40,50 c0,35 -20,50 -40,50 c25,0 80,-15 80,-50 c0,-35 -55,-50 -80,-50' : 
                   t==='NOT' ? 'M150,30 l80,50 l-80,50 z' : 'M150,30 h60 a50,50 0 0 1 0,100 h-60 z');
        svg += `<path d="${path}" class="gate-body ${q?'active':''}" />`;
        if(t.includes('N') || t==='NOT') svg += `<circle cx="${t==='NOT'?236:266}" cy="80" r="6" class="gate-body" style="fill:white" />`;
        svg += wire(t==='NOT'?242:272, 80, 380, 80, q);
        svg += text(t==='NOT'?175:190, 85, t);
    } 
    else if (mode === 'half-adder') {
        svg += rect(120, 30, 160, 100, state.inputs.A || state.inputs.B);
        svg += text(200, 85, 'HALF ADDER');
        svg += wire(20, 60, 120, 60, state.inputs.A) + wire(20, 100, 120, 100, state.inputs.B);
        svg += wire(280, 60, 380, 60, state.inputs.A ^ state.inputs.B);
        svg += wire(280, 100, 380, 100, state.inputs.A && state.inputs.B);
    } 
    else if (mode === 'full-adder') {
        svg += rect(120, 20, 160, 120, state.inputs.A || state.inputs.B || state.inputs.Cin);
        svg += text(200, 85, 'FULL ADDER');
        svg += wire(20, 40, 120, 40, state.inputs.A) + wire(20, 80, 120, 80, state.inputs.B) + wire(20, 120, 120, 120, state.inputs.Cin);
        const s = state.inputs.A ^ state.inputs.B ^ state.inputs.Cin;
        svg += wire(280, 50, 380, 50, s) + wire(280, 110, 380, 110, !s && (state.inputs.A||state.inputs.B||state.inputs.Cin)); // simplified carry visualization
    }
    else if (mode === 'mux') {
        svg += `<path d="M140,20 L260,40 L260,120 L140,140 Z" class="gate-body ${state.inputs.I0||state.inputs.I1?'active':''}" />`;
        svg += text(200, 85, 'MUX 2:1');
        svg += wire(20, 60, 140, 60, state.inputs.I0) + wire(20, 100, 140, 100, state.inputs.I1);
        svg += wire(200, 130, 200, 160, state.inputs.S);
        svg += wire(260, 80, 380, 80, state.inputs.S ? state.inputs.I1 : state.inputs.I0);
    }
    else {
        svg += rect(120, 30, 160, 100, true);
        svg += text(200, 85, mode.toUpperCase());
    }
    return svg + `</svg>`;
}

function renderRegister() {
    const c = document.getElementById('register-container');
    if (c) c.innerHTML = state.register.map((v, i) => `<div class="ff-block ${v?'active':''}" style="width:60px; height:60px;"><span style="font-size:0.6rem; opacity:0.5;">Q${3-i}</span><div style="font-family:'JetBrains Mono'; font-weight:800; font-size:1.2rem;">${v}</div></div>`).join('');
}

function renderScanChain() {
    const c = document.getElementById('scan-container');
    if (c) c.innerHTML = state.sequential.scanChain.map((v, i) => `<div class="ff-block ${v?'active':''}" style="padding:10px;"><span style="font-size:0.6rem;">FF${i+1}</span><div style="font-size:1.2rem; font-weight:800;">${v}</div></div>`).join(' → ');
    updateIndicator('serialOut', state.sequential.scanChain[2]);
}

function renderMBIST() {
    const g = document.getElementById('mbist-grid');
    if (!g) return;
    g.innerHTML = state.mbist.memory.map((v, i) => `<div class="memory-cell ${state.mbist.status!=='IDLE'?'accessed':''}">${v}</div>`).join('');
    const res = document.getElementById('mbist-results');
    if (res) {
        if (state.mbist.status === 'PASS') res.innerHTML = `<span style="color:var(--success)">TEST PASS ✓</span>`;
        else if (state.mbist.status === 'FAIL') res.innerHTML = `<span style="color:var(--danger)">TEST FAIL ✗</span>`;
        else res.innerHTML = `<span style="color:var(--text-secondary)">${state.mbist.status}...</span>`;
    }
}

function updateIndicator(id, val) { const el = document.getElementById(`indicator-${id}`); if (el) { el.classList.toggle('high', !!val); el.textContent = val ? '1' : '0'; } }
function renderSteps(s) { if(elements.stepsContent) elements.stepsContent.innerHTML = s.map((t, i) => `<div class="step-item ${i===s.length-1?'active':''}"><div class="step-title">Pulse Step ${i+1}</div><div class="step-value">${t}</div></div>`).join(''); }
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
    else if (m==='full-adder') idx = (i.A?4:0)+(i.B?2:0)+(i.Cin?1:0);
    else if (m==='mux') idx = (i.S?4:0)+(i.I0?2:0)+(i.I1?1:0); // this is a simple shift for highlighting
    
    if(!elements.truthTable) return;
    elements.truthTable.querySelectorAll('tr').forEach(r=>r.classList.remove('highlight-row'));
    const active = elements.truthTable.querySelector(`#row-${idx}`);
    if (active) active.classList.add('highlight-row');
}
function updateExplanation() {
    const m = state.currentMode;
    const d = {
        'gates': 'Fundamental building blocks of digital logic. Gates perform boolean operations (AND, OR, NOT) on input signals.',
        'half-adder': 'A combinational circuit that performs the addition of two bits. It produces a Sum and a Carry bit.',
        'full-adder': 'Adds three bits (A, B, and Carry-In), essential for multi-bit binary addition in ripple-carry adders.',
        'mux': 'A data selector that routes one of several inputs to a single output line based on selector signals.',
        'decoder': 'Converts an n-bit input code into one of 2^n unique output signals, commonly used for chip select logic.',
        'd-flip-flop': 'A basic memory element that captures the value of the D-input at a specific clock edge.',
        'counter': 'A sequential circuit that cycles through a set of states. This 2-bit counter tracks pulses from 0 to 3.',
        'register': 'A group of flip-flops used to store a multi-bit word. Essential for data storage in CPUs.',
        'scan-chain': 'A Design-for-Test (DFT) technique where flip-flops are chained to allow internal state observation and control.',
        'mbist': 'Memory Built-In Self-Test. An on-chip engine that automatically verifies memory integrity using hardware algorithms.'
    };
    if(elements.explanation) elements.explanation.innerHTML = `<p style="line-height:1.6; color:var(--text-secondary);">${d[m] || ''}</p>`;
}

document.addEventListener('DOMContentLoaded', init);
