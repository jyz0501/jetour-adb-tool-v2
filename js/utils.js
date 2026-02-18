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
    if ('usb' in navigator) {
        document.getElementById('usb-warning').style.display = 'none';
        return true;
    } else {
        document.getElementById('usb-warning').style.display = 'block';
        return false;
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