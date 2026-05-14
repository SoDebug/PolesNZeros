// 1. 初始化数据和网格
const resolution = 60;
const x_range = { min: -4, max: 4 }; // 实部 σ
const y_range = { min: -5, max: 5 }; // 虚部 jω
let x_data = [], y_data = [];

for (let i = 0; i <= resolution; i++) {
    x_data.push(x_range.min + (x_range.max - x_range.min) * (i / resolution));
    y_data.push(y_range.min + (y_range.max - y_range.min) * (i / resolution));
}

/**
 * 核心计算函数：计算 S 平面上每个点的幅度 |H(s)|
 */
function calculateSurface(pr, pi, zr, zi) {
    let z_data = [];
    let freq_response_x = [];
    let freq_response_y = [];
    let freq_response_z = [];

    for (let i = 0; i < y_data.length; i++) {
        let row = [];
        for (let j = 0; j < x_data.length; j++) {
            let s_real = x_data[j];
            let s_imag = y_data[i];

            // 分子 (s - zero) 的模：|s - (zr + jzi)|
            let num = Math.sqrt(Math.pow(s_real - zr, 2) + Math.pow(s_imag - zi, 2));
            
            // 分母 (s - pole) 的模。通常极点成对出现(共轭)
            // |s - (pr + jpi)| * |s - (pr - jpi)|
            let den1 = Math.sqrt(Math.pow(s_real - pr, 2) + Math.pow(s_imag - pi, 2));
            let den2 = Math.sqrt(Math.pow(s_real - pr, 2) + Math.pow(s_imag - (-pi), 2));
            let den = den1 * den2;
            
            // 避免除以0，并计算幅度
            let mag = den < 0.01 ? 10 : num / den;

            // 限制最大高度，防止三维图变得像一根针，影响视觉
            row.push(Math.min(mag, 5));

            // 提取虚轴上的数据 (s = jω, 即实部趋于 0 的点)
            // 这里的 0.08 是为了在网格采样中捕捉到靠近 y 轴的线
            if (Math.abs(s_real) < 0.08) {
                freq_response_x.push(0);
                freq_response_y.push(s_imag);
                freq_response_z.push(Math.min(mag, 5.05)); // 稍微高出一点防止被曲面遮挡
            }
        }
        z_data.push(row);
    }
    return { z_data, freq_response_x, freq_response_y, freq_response_z };
}

/**
 * 更新图表函数
 */
function updatePlot() {
    const pr = parseFloat(document.getElementById('pr').value);
    const pi = parseFloat(document.getElementById('pi').value);
    const zr = parseFloat(document.getElementById('zr').value);
    const zi = parseFloat(document.getElementById('zi').value);

    // 更新显示的数值
    document.getElementById('val-pr').innerText = pr.toFixed(1);
    document.getElementById('val-pi').innerText = pi.toFixed(1);
    document.getElementById('val-zr').innerText = zr.toFixed(1);
    document.getElementById('val-zi').innerText = zi.toFixed(1);

    // 调用计算逻辑
    const { z_data, freq_response_x, freq_response_y, freq_response_z } = calculateSurface(pr, pi, zr, zi);

    const surface = {
        z: z_data,
        x: x_data,
        y: y_data,
        type: 'surface',
        colorscale: 'Viridis',
        opacity: 0.85,
        showscale: false,
        lighting: { ambient: 0.6, diffuse: 0.5, specular: 0.2 },
    };

    const freq_line = {
        x: freq_response_x,
        y: freq_response_y,
        z: freq_response_z,
        type: 'scatter3d',
        mode: 'lines',
        line: { color: '#1D1B20', width: 8 },
        name: 'jω轴响应 (频响)'
    };

    const layout = {
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)', 
        plot_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: { title: 'σ (实部)', gridcolor: '#ddd' },
            yaxis: { title: 'jω (虚部)', gridcolor: '#ddd' },
            zaxis: { title: '|H(s)|', range: [0, 5], gridcolor: '#ddd' },
            camera: { eye: { x: -1.25, y: -1.25, z: 1.25 } }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 },
        font: { family: 'system-ui, sans-serif', color: '#49454F' },
        showlegend: false
    };

    const config = {
        responsive: true,
        displaylogo: false
    };

    Plotly.react('plot-div', [surface, freq_line], layout, config);
}

// 2. 绑定滑块事件
['pr', 'pi', 'zr', 'zi'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePlot);
});

// 3. 页面加载完成后立即渲染一次
document.addEventListener('DOMContentLoaded', updatePlot);