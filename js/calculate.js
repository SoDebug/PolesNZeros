/**
 * 配置与常量
 */
const CONFIG = {
    res: 60,
    xRange: [-4, 4],
    yRange: [-5, 5],
    zMax: 5,
    presets: {
        resonance: {
            vals: [-0.2, 2.5, 0, 0],
            label: "高Q谐振",
            desc: "<strong>高Q谐振</strong>：极点靠近虚轴。$j\\omega$ 轴在极点频率处被强烈抬升，形成锐利的增益峰。"
        },
        notch: {
            vals: [-1.0, 0, 0, 2.5],
            label: "陷波器",
            desc: "<strong>陷波器 (Notch)</strong>：零点精准落在虚轴。系统在该频率增益为零，可消除特定频率噪声。"
        },
        unstable: {
            vals: [0.1, 2.0, 0, 0],
            label: "不稳定系统",
            desc: "<strong>不稳定系统</strong>：极点进入右半平面。系统产生指数级增长的响应，物理上不可持续。"
        },
        cancel: {
            vals: [-2.0, 0, -2.0, 0],
            label: "零极点抵消",
            desc: "<strong>零极点抵消</strong>：零点与极点位置重合。能量场抵消，使得频率响应保持平滑。"
        }
    }
};

// 初始化网格数据
const x_data = Array.from({length: CONFIG.res + 1}, (_, i) => CONFIG.xRange[0] + (CONFIG.xRange[1] - CONFIG.xRange[0]) * (i / CONFIG.res));
const y_data = Array.from({length: CONFIG.res + 1}, (_, i) => CONFIG.yRange[0] + (CONFIG.yRange[1] - CONFIG.yRange[0]) * (i / CONFIG.res));

/**
 * 核心数学计算
 */
function calculateSurface(pr, pi, zr, zi) {
    const z_data = [];
    const freq_res = { x: [], y: [], z: [] };

    y_data.forEach(s_imag => {
        const row = [];
        x_data.forEach(s_real => {
            const num = Math.hypot(s_real - zr, s_imag - zi);
            const den = Math.hypot(s_real - pr, s_imag - pi) * Math.hypot(s_real - pr, s_imag + pi);
            const mag = den < 0.01 ? CONFIG.zMax * 2 : num / den;
            const val = Math.min(mag, CONFIG.zMax);
            
            row.push(val);
            if (Math.abs(s_real) < 0.08) {
                freq_res.x.push(0);
                freq_res.y.push(s_imag);
                freq_res.z.push(Math.min(mag, CONFIG.zMax + 0.05));
            }
        });
        z_data.push(row);
    });
    return { z_data, freq_res };
}

/**
 * UI 渲染
 */
function updatePlot() {
    const getVal = (id) => parseFloat(document.getElementById(id).value);
    const [pr, pi, zr, zi] = ['pr', 'pi', 'zr', 'zi'].map(id => {
        const v = getVal(id);
        document.getElementById(`val-${id}`).innerText = v.toFixed(1);
        return v;
    });

    const { z_data, freq_res } = calculateSurface(pr, pi, zr, zi);

    const data = [
        {
            z: z_data, x: x_data, y: y_data, type: 'surface',
            colorscale: 'Viridis', opacity: 0.85, showscale: false,
            lighting: { ambient: 0.6, diffuse: 0.5, specular: 0.2 }
        },
        {
            x: freq_res.x, y: freq_res.y, z: freq_res.z,
            type: 'scatter3d', mode: 'lines',
            line: { color: '#1D1B20', width: 8 }
        }
    ];

    const layout = {
        autosize: true, paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: { title: 'σ (实部)' }, yaxis: { title: 'jω (虚部)' },
            zaxis: { title: '|H(s)|', range: [0, CONFIG.zMax] },
            camera: { eye: { x: -1.25, y: -1.25, z: 1.25 } }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 },
        showlegend: false
    };

    Plotly.react('plot-div', data, layout, { responsive: true, displaylogo: false });
}

/**
 * 预设应用逻辑
 */
function applyPreset(type) {
    const preset = CONFIG.presets[type];
    if (!preset) return;

    ['pr', 'pi', 'zr', 'zi'].forEach((id, i) => {
        document.getElementById(id).value = preset.vals[i];
    });

    const descBox = document.getElementById('example-desc');
    descBox.classList.remove('active');
    void descBox.offsetWidth; 
    descBox.classList.add('active');
    descBox.innerHTML = preset.desc;

    if (window.MathJax) MathJax.typesetPromise([descBox]);
    updatePlot();
}

/**
 * 事件绑定
 */
document.addEventListener('DOMContentLoaded', () => {
    ['pr', 'pi', 'zr', 'zi'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePlot);
    });

    document.querySelector('.note').addEventListener('mouseenter', () => {
        if (window.MathJax) MathJax.typesetPromise();
    });

    updatePlot();
});