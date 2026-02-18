// 主入口文件

// 初始化
function init() {
    // 检测浏览器是否支持WebUSB
    checkWebUSBSupport();
    
    // 设置默认设备名
    setDeviceName(null);
    
    // 绑定事件监听器
    bindEventListeners();
}

// 绑定事件监听器
function bindEventListeners() {
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 可以在这里添加其他全局事件监听器
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            init,
            bindEventListeners
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}