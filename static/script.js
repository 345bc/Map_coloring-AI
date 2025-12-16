let network = null;
let userPalette = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
let isAnimating = false;
let stopFlag = false;

window.onload = function() {
    renderPaletteUI();
    loadTemplate('petersen');
    
    // Update slider values
    document.getElementById('numNodes').oninput = function() { document.getElementById('nodeVal').innerText = this.value; }
    document.getElementById('density').oninput = function() { document.getElementById('densityVal').innerText = Math.round(this.value*100)+'%'; }
};

// --- QUẢN LÝ TAB & UI ---
function setTab(mode) {
    ['random', 'template', 'manual'].forEach(m => {
        document.getElementById(`tab-${m}`).classList.toggle('hidden', m !== mode);
        const btn = document.getElementById(`btn-${m}`);
        if(m === mode) {
            btn.className = "tab-btn tab-active flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md text-center";
        } else {
            btn.className = "tab-btn tab-inactive flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md text-center";
        }
    });

    if(mode !== 'manual') {
        document.getElementById('editModeToggle').checked = false;
        toggleEditMode();
    }
}

function toggleInputType() {
    const type = document.getElementById('inputType').value;
    const box = document.getElementById('manualInput');
    box.placeholder = type === 'edge' ? "VD: 0-1, 1-2, 2-3, 3-0" : "VD:\n0 1 1\n1 0 1\n1 1 0";
}

// --- QUẢN LÝ MÀU SẮC ---
function renderPaletteUI() {
    const container = document.getElementById('paletteList');
    const legend = document.getElementById('legendBox');
    
    container.innerHTML = '';
    legend.innerHTML = '';

    if (userPalette.length === 0) {
        legend.innerHTML = '<span class="text-xs text-slate-400 italic font-light">Chưa có màu nào</span>';
    }

    userPalette.forEach((color, index) => {
        // Sidebar UI
        const div = document.createElement('div');
        div.className = "w-8 h-8 rounded-lg cursor-pointer border border-slate-200 relative group shadow-sm transition hover:scale-110";
        div.style.backgroundColor = color;
        div.innerHTML = `<span class="absolute -top-1.5 -right-1.5 bg-slate-800 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center hidden group-hover:flex shadow-md border border-white" onclick="removeColor(${index})">×</span>`;
        container.appendChild(div);

        // Legend UI
        const lItem = document.createElement('div');
        lItem.className = "flex items-center gap-2 mb-1 p-1 rounded hover:bg-slate-50";
        lItem.innerHTML = `<span class="w-3 h-3 rounded-full border border-slate-300 shadow-sm" style="background:${color}"></span> <span class="text-xs font-medium text-slate-600">Màu ưu tiên ${index+1}</span>`;
        legend.appendChild(lItem);
    });
}

function addColor() {
    const color = document.getElementById('newColorPicker').value;
    // Kiểm tra trùng lặp
    if (userPalette.includes(color.toLowerCase()) || userPalette.includes(color.toUpperCase())) {
        alert("Màu này đã có trong danh sách!"); return;
    }
    if(userPalette.length >= 10) { alert("Tối đa 10 màu!"); return; }
    userPalette.push(color);
    renderPaletteUI();
}

function removeColor(i) {
    if(userPalette.length > 1) { userPalette.splice(i, 1); renderPaletteUI(); }
    else { alert("Cần ít nhất 1 màu!"); }
}

function resetPalette() {
    userPalette = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    renderPaletteUI();
}

// --- LOGIC VẼ & NHẬP LIỆU ---
function toggleEditMode() {
    if(!network) return;
    const isEditing = document.getElementById('editModeToggle').checked;
    network.setOptions({
        manipulation: {
            enabled: isEditing, initiallyActive: isEditing,
            addNode: function(data, cb) {
                const all = network.body.data.nodes.get();
                const newId = all.length > 0 ? Math.max(...all.map(n=>n.id))+1 : 0;
                data.id = newId; data.label = newId+''; data.color={background:'#f1f5f9', border:'#64748b'};
                cb(data);
            },
            addEdge: function(data, cb) { data.from==data.to ? alert("Không hỗ trợ khuyên!") : cb(data); }
        },
        interaction: { dragView: !isEditing }
    });
    updateStatus(isEditing ? "CHẾ ĐỘ VẼ: Bật" : "CHẾ ĐỘ VẼ: Tắt");
}

function parseInputData() {
    const type = document.getElementById('inputType').value;
    const text = document.getElementById('manualInput').value.trim();
    if(!text) return alert("Chưa nhập dữ liệu!");
    
    let nodes=[], edges=[], nodeSet=new Set();
    try {
        if (type === 'edge') {
            text.split(/[\n,;]+/).forEach(pair => {
                const p = pair.trim().split(/[- ]+/);
                if(p.length>=2 && !isNaN(p[0]) && !isNaN(p[1])) {
                    const u=parseInt(p[0]), v=parseInt(p[1]);
                    edges.push({from:u, to:v}); nodeSet.add(u); nodeSet.add(v);
                }
            });
            Array.from(nodeSet).sort((a,b)=>a-b).forEach(id=>nodes.push({id:id, label:id+''}));
        } else {
            const rows = text.split('\n').map(r=>r.trim()).filter(r=>r);
            for(let i=0; i<rows.length; i++) {
                nodes.push({id:i, label:i+''});
                const cols = rows[i].split(/[\s,]+/).map(Number);
                for(let j=i+1; j<rows.length; j++) if(cols[j]===1) edges.push({from:i, to:j});
            }
        }
        if(!nodes.length) throw new Error("Dữ liệu trống");
        initNetwork(nodes, edges);
        updateStatus("Đã nhập dữ liệu thành công");
    } catch(e) { alert("Lỗi dữ liệu!"); }
}

// --- VIS.JS & SERVER ---
function initNetwork(nodes, edges) {
    const container = document.getElementById('mynetwork');
    const data = { nodes: new vis.DataSet(nodes.map(n=>({...n, color:'#f1f5f9', size:25}))), edges: new vis.DataSet(edges) };
    const options = {
        nodes: { shape:'dot', font:{size:14, color:'#334155', face:'JetBrains Mono'}, borderWidth:2, color:{border:'#94a3b8'}, shadow:true },
        edges: { width:2, color:'#cbd5e1', smooth:true },
        physics: { stabilization:false, barnesHut:{springConstant:0.04, gravitationalConstant:-3000} }
    };
    network = new vis.Network(container, data, options);
}

async function generateRandom() {
    const n = document.getElementById('numNodes').value;
    const d = document.getElementById('density').value;
    updateStatus("Đang tạo đồ thị...");
    const res = await fetch('/generate-random', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nodes:n, density:d})
    });
    const data = await res.json();
    initNetwork(data.nodes, data.edges);
    updateStatus("Đã tạo đồ thị ngẫu nhiên");
}

function loadTemplate(type) {
    let nodes=[], edges=[];
    if(type==='petersen'){
        for(let i=0;i<10;i++) nodes.push({id:i,label:i+''});
        edges=[{from:0,to:1},{from:1,to:2},{from:2,to:3},{from:3,to:4},{from:4,to:0},{from:0,to:5},{from:1,to:6},{from:2,to:7},{from:3,to:8},{from:4,to:9},{from:5,to:7},{from:7,to:9},{from:9,to:6},{from:6,to:8},{from:8,to:5}];
    } else if (type==='star') {
        nodes.push({id:0,label:'C'}); for(let i=1;i<9;i++){nodes.push({id:i,label:i+''}); edges.push({from:0,to:i});}
    } else if (type==='wheel') {
        nodes.push({id:0,label:'0'}); for(let i=1;i<9;i++){nodes.push({id:i,label:i+''}); edges.push({from:0,to:i}); edges.push({from:i,to:i===8?1:i+1});}
    } else if (type==='grid') {
        for(let r=0;r<4;r++) for(let c=0;c<4;c++){ let id=r*4+c; nodes.push({id:id,label:id+''}); if(c<3) edges.push({from:id,to:id+1}); if(r<3) edges.push({from:id,to:id+4}); }
    } else if (type==='complete') {
        for(let i=0;i<6;i++) nodes.push({id:i,label:i+''}); for(let i=0;i<6;i++) for(let j=i+1;j<6;j++) edges.push({from:i,to:j});
    }
    initNetwork(nodes, edges);
    updateStatus(`Đã tải mẫu: ${type.toUpperCase()}`);
}

async function runSolver() {
    if(!network || isAnimating) return;
    const all = network.body.data.nodes.get().map(n=>({...n, color:'#f1f5f9', size:25}));
    network.body.data.nodes.update(all);

    document.getElementById('btnRun').classList.add('hidden');
    document.getElementById('btnStop').classList.remove('hidden');
    updateStatus("Đang chạy DSATUR...");

    try {
        const res = await fetch('/solve', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                nodes: network.body.data.nodes.get(),
                edges: network.body.data.edges.get(),
                num_colors: userPalette.length
            })
        });
        const result = await res.json();
        if(!result.history.length) { updateStatus("Thất bại: Không đủ màu!"); finishAnim(); return; }

        isAnimating=true; stopFlag=false;
        const ds = network.body.data.nodes;
        
        for(let i=0; i<result.history.length; i++){
            if(stopFlag) break;
            const step = result.history[i];
            const delay = 810 - document.getElementById('animSpeed').value;
            const color = step.color_index > 0 ? userPalette[step.color_index-1] : '#f1f5f9';
            
            ds.update({id:step.node, color:{background:color, border:'#1e293b'}, size:35});
            updateStatus(step.action==='try' ? `Thử màu ${step.color_index} cho Đỉnh ${step.node}` : `Quay lui tại Đỉnh ${step.node}`);
            await new Promise(r=>setTimeout(r, delay));
            ds.update({id:step.node, size:25});
        }
        updateStatus(result.success ? "Hoàn thành!" : "Không thể tô hết.");
    } catch(e) { console.error(e); } finally { finishAnim(); }
}

function stopAnimation() { stopFlag=true; updateStatus("Đã dừng."); }
function finishAnim() { isAnimating=false; document.getElementById('btnRun').classList.remove('hidden'); document.getElementById('btnStop').classList.add('hidden'); }
function updateStatus(msg) { document.getElementById('statusBox').innerText = msg; }