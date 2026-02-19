// 全局变量
let adb;
let webusb;

// 执行日志显示
let log = (...args) => {
    if (args[0] instanceof Error) {
        console.error.apply(console, args);
    } else {
        console.log.apply(console, args);
    }
    window.location.hash = '#exec-result';
    let logElement = document.getElementById('log');
    if (logElement) {
        logElement.textContent = logElement.textContent + args.join(' ') + '\n';
        logElement.scrollTop = logElement.scrollHeight;
    }
};

// 定义一个异步函数clear，用于清空日志内容
let clear = async () => {
    let logElement = document.getElementById('log');
    if (logElement) {
        logElement.textContent = "";
    }
};

// 定义一个异步函数 showProgress，用于显示或隐藏进度条
let showProgress = async (show) => {
    let progress = document.getElementById('progress');
    if (progress) {
        if (show) {
            progress.className = "progress active progress-striped";
        } else {
            progress.className = "progress";
            log("");
        }
    }
};

// 更新下载百分比文本
function updateDownloadProgressText(percentage) {
    var progressText = document.getElementById('download-progress-text');
    var progressBar = document.getElementById('download-progress-bar');
    progressText.textContent = percentage + '%';
    progressBar.style.width = percentage + '%';
}

// 使用 XMLHttpRequest 来获取下载进度
async function fetchWithProgress(url, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onprogress = onProgress;
        xhr.onload = function() {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(new Error('Failed to fetch the resource'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('Network error'));
        };
        xhr.send();
    });
}

// 硬刷新
function hardReload() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    // 添加/覆盖时间戳参数（确保每次URL不同）
    params.set('t', new Date().getTime());
    // 重构完整URL（保留协议/域名/路径/原始参数）
    url.search = params.toString();
    window.location.href = url.toString();
}

// 检测浏览器是否支持WebUSB
function checkWebUSBSupport() {
    // 基本检测
    if (!('usb' in navigator)) {
        document.getElementById('usb-warning').style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }
    
    // 高级浏览器检测
    const userAgent = navigator.userAgent;
    
    // Chrome 浏览器
    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) {
            const chromeVersion = parseInt(chromeMatch[1]);
            if (chromeVersion >= 61) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        }
    }
    
    // Edge 浏览器
    if (userAgent.indexOf('Edg') > -1) {
        const edgeMatch = userAgent.match(/Edg\/(\d+)/);
        if (edgeMatch) {
            const edgeVersion = parseInt(edgeMatch[1]);
            if (edgeVersion >= 79) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        }
    }
    
    // Opera 浏览器
    if (userAgent.indexOf('OPR') > -1) {
        const operaMatch = userAgent.match(/OPR\/(\d+)/);
        if (operaMatch) {
            const operaVersion = parseInt(operaMatch[1]);
            if (operaVersion >= 48) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        }
    }
    
    // 其他浏览器
    document.getElementById('usb-warning').style.display = 'block';
    showEdgeDownloadPopup();
    return false;
}

// 显示 Edge 浏览器下载弹窗
function showEdgeDownloadPopup() {
    const popup = confirm('您的浏览器不支持 WebUSB，请使用 Microsoft Edge 浏览器。\n\n是否立即下载 Edge 浏览器？');
    if (popup) {
        window.open('https://www.microsoft.com/zh-cn/edge/download', '_blank');
    }
}

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            log,
            clear,
            showProgress,
            updateDownloadProgressText,
            fetchWithProgress,
            hardReload,
            checkWebUSBSupport
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}