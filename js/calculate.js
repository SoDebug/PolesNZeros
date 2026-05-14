/**
 * 1. 核心配置与全局网格
 */
const CONFIG = {
    res: 60,
    xRange: [-4, 4], yRange: [-5, 5], zMax: 5,
    timeRange: 10, timeRes: 400,
    presets: {
        resonance: { vals: [-0.2, 2.5, 0, 0], desc: "<strong>高Q谐振</strong>：极点靠近虚轴。在极点频率处产生尖锐增益峰。" },
        notch: { vals: [-1.0, 0, 0, 2.5], desc: "<strong>陷波器</strong>：零点落在虚轴，系统在该频率增益降为零。" },
        unstable: { vals: [0.2, 2.0, 0, 0], desc: "<strong>不稳定系统</strong>：极点实部 > 0。响应随时间指数级发散。" },
        cancel: { vals: [-2.0, 0, -2.0, 0], desc: "<strong>零极点抵消</strong>：零极点重合，能量抵消，响应平滑。" }
    }
};

// 预生成 S 平面网格数据
const meshX = Array.from({length: CONFIG.res + 1}, (_, i) => CONFIG.xRange[0] + (CONFIG.xRange[1] - CONFIG.xRange[0]) * (i / CONFIG.res));
const meshY = Array.from({length: CONFIG.res + 1}, (_, i) => CONFIG.yRange[0] + (CONFIG.yRange[1] - CONFIG.yRange[0]) * (i / CONFIG.res));

/**
 * 2. 核心数学函数
 */
function getSurfaceData(pr, pi, zr, zi) {
    const zData = [];
    const freqLine = { x: [], y: [], z: [] };
    meshY.forEach(s_imag => {
        const row = [];
        meshX.forEach(s_real => {
            const num = Math.hypot(s_real - zr, s_imag - zi);
            const den = Math.hypot(s_real - pr, s_imag - pi) * Math.hypot(s_real - pr, s_imag + pi);
            const mag = den < 0.01 ? 10 : num / den;
            const val = Math.min(mag, CONFIG.zMax);
            row.push(val);
            if (Math.abs(s_real) < 0.08) {
                freqLine.x.push(0); freqLine.y.push(s_imag); freqLine.z.push(Math.min(mag, CONFIG.zMax + 0.05));
            }
        });
        zData.push(row);
    });
    return { zData, freqLine };
}

function getTimeData(sigma, omega) {
    const tArr = [], yArr = [];
    const steps = 600; 
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * CONFIG.timeRange;
        tArr.push(t);
        const amp = Math.exp(sigma * t) * Math.cos(omega * t);
        const limit = 1000000; 
        yArr.push(Math.max(Math.min(amp, limit), -limit));
    }
    return { tArr, yArr };
}

/**
 * 3. 绘图主逻辑
 */
function updatePlot() {
    const pr = parseFloat(document.getElementById('pr').value);
    const pi = parseFloat(document.getElementById('pi').value);
    const zr = parseFloat(document.getElementById('zr').value);
    const zi = parseFloat(document.getElementById('zi').value);

    // 同步文本显示
    document.getElementById('val-pr').innerText = pr.toFixed(1);
    document.getElementById('val-pi').innerText = pi.toFixed(1);
    document.getElementById('val-zr').innerText = zr.toFixed(1);
    document.getElementById('val-zi').innerText = zi.toFixed(1);

    // --- 1. 3D S-Plane ---
    const sData = getSurfaceData(pr, pi, zr, zi);
    Plotly.react('plot-div', [
        { z: sData.zData, x: meshX, y: meshY, type: 'surface', colorscale: 'Viridis', showscale: false, opacity: 0.85 },
        { x: sData.freqLine.x, y: sData.freqLine.y, z: sData.freqLine.z, type: 'scatter3d', mode: 'lines', line: {color: '#000', width: 6} }
    ], {
        autosize: true, paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: { title: 'σ (实部)' }, yaxis: { title: 'jω (虚部)' }, zaxis: { title: '|H(s)|', range: [0, 5] },
            camera: { eye: { x: -1.3, y: -1.3, z: 1.1 } }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 }
    }, { responsive: true, displaylogo: false });

    // --- 2. 2D 时域响应图 ---
    const tData = getTimeData(pr, pi);
    const isUnstable = pr > 0;
    const theoryMax = isUnstable ? Math.exp(pr * CONFIG.timeRange) : 1.2;
    const yLimit = Math.min(theoryMax, 1000000);

    // 使用 MathJax 格式的动态标题
    const plotTitle = isUnstable ? 
        `指数级发散 (不稳定: $e^{${pr.toFixed(1)}t}$)` : 
        '收敛响应 (稳定)';

    Plotly.react('time-plot-div', [{
        x: tData.tArr, y: tData.yArr, type: 'scatter', mode: 'lines',
        line: { color: isUnstable ? '#B3261E' : '#6750A4', width: 2.5 },
        fill: 'tozeroy', 
        fillcolor: isUnstable ? 'rgba(179,38,30,0.05)' : 'rgba(103,80,164,0.05)'
    }], {
        title: { 
            text: plotTitle, 
            font: { color: isUnstable ? '#B3261E' : '#49454F', size: 14 } 
        },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 80, r: 30, b: 50, t: 50 },
        xaxis: { title: '时间 (t)' },
        yaxis: { 
            title: '幅度 y(t)', 
            range: [-yLimit * 1.1, yLimit * 1.1], 
            exponentformat: 'e',
            showexponent: 'all'
        }
    }, { responsive: true, displaylogo: false });
}

/**
 * 4. 预设与事件
 */
function applyPreset(type) {
    const p = CONFIG.presets[type];
    if (!p) return;

    // 设置滑块值
    document.getElementById('pr').value = p.vals[0];
    document.getElementById('pi').value = p.vals[1];
    document.getElementById('zr').value = p.vals[2];
    document.getElementById('zi').value = p.vals[3];
    
    // 更新描述文本
    const d = document.getElementById('example-desc');
    d.innerHTML = p.desc;
    d.classList.add('active');
    setTimeout(() => d.classList.remove('active'), 500);

    // --- 核心修复：使用 MathJax 2 的渲染队列 ---
    if (window.MathJax && window.MathJax.Hub) {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, d]);
    }

    updatePlot();
}

document.addEventListener('DOMContentLoaded', () => {
    // 绑定事件
    ['pr', 'pi', 'zr', 'zi'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePlot);
    });
    
    // 初次渲染：确保 MathJax 准备就绪后再运行
    if (window.MathJax && window.MathJax.Hub) {
        MathJax.Hub.Queue(updatePlot);
    } else {
        setTimeout(updatePlot, 500);
    }
});