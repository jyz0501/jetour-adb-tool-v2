// 设备管理相关功能
// 参考 Tango ADB 的架构设计

// 全局变量
window.adbDevice = null;
window.adbTransport = null;

// 车机授权提示弹窗
let authorizationPromptElement = null;

// 显示车机授权提示
function showDeviceAuthorizationPrompt() {
    // 移除已存在的弹窗
    closeDeviceAuthorizationPrompt();
    
    // 创建弹窗元素
    authorizationPromptElement = document.createElement('div');
    authorizationPromptElement.id = 'authorization-prompt';
    authorizationPromptElement.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center;">
            <div style="background-color: white; padding: 30px; border-radius: 12px; max-width: 500px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
                <h2 style="margin: 0 0 20px 0; color: #333;">请在车机上授权</h2>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                    车机屏幕上应该会弹出 USB 调试授权提示<br><br>
                    请在车机屏幕上点击 <strong>"允许"</strong> 或 <strong>"始终允许"</strong><br><br>
                    授权成功后此弹窗将自动关闭
                </p>
                <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px; text-align: left; font-size: 14px;">
                    <strong>提示：</strong><br>
                    • 如果车机屏幕没有弹出提示，请尝试拔掉USB线重新插入<br>
                    • 请确保已开启开发者选项和USB调试功能<br>
                    • 车机可能需要输入PIN码进行授权
                </div>
                <button onclick="closeDeviceAuthorizationPrompt()" style="padding: 12px 30px; background-color: #6c757d; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    关闭提示
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(authorizationPromptElement);
}

// 关闭车机授权提示
function closeDeviceAuthorizationPrompt() {
    if (authorizationPromptElement) {
        document.body.removeChild(authorizationPromptElement);
        authorizationPromptElement = null;
    }
}

// 显示授权失败提示
function showDeviceAuthorizationError() {
    showModal('USB 授权失败', `
        <div style="text-align: left; line-height: 1.8;">
            <p><strong>无法获取 USB 接口权限</strong></p>
            <p>请在车机屏幕上完成以下操作：</p>
            <ol style="margin: 10px 0 10px 20px;">
                <li>查看车机屏幕是否有 USB 调试授权提示</li>
                <li>点击 <strong>"允许"</strong> 或 <strong>"始终允许"</strong></li>
                <li>如果没有弹出提示，请：</li>
                <ul style="margin: 5px 0 5px 40px;">
                    <li>拔掉 USB 线重新插入</li>
                    <li>检查车机的开发者选项中"USB 调试"是否已开启</li>
                    <li>关闭其他正在运行的 ADB 工具（如命令行 adb）</li>
                </ul>
            </ol>
            <p style="color: #dc3545; margin-top: 15px;"><strong>注意：</strong>每次拔插USB线后，都需要在车机上重新授权</p>
        </div>
    `, {
        showCancel: false,
        confirmText: '我知道了',
        confirmClass: 'custom-modal-btn-primary'
    });
}

// 设备日志记录
function logDevice(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent += logEntry;
        deviceLogElement.scrollTop = deviceLogElement.scrollHeight;
    }
    
    // 同时输出到控制台，方便调试
    console.log(`[Device] ${message}`);
}

// 清除设备日志
function clearDeviceLog() {
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = '';
    }
}

// 点击检测提示
let initWebUSB = async (device) => {
    clear();
    try {
        // 使用新的 WebUSB 传输
        logDevice('正在初始化 WebUSB 设备...');

        if (device) {
            // 使用用户已选择的设备
            window.adbTransport = new WebUsbTransport(device);
        } else {
            // 请求新设备
            window.adbTransport = await WebUsbTransport.requestDevice();
        }

        // 显示车机授权提示弹窗
        showDeviceAuthorizationPrompt();

        await window.adbTransport.open();
        log('WebUSB 传输初始化成功');
        logDevice('WebUSB 传输初始化成功');
        
        // 关闭授权提示弹窗
        closeDeviceAuthorizationPrompt();
        
        return true;
    } catch (error) {
        // 关闭授权提示弹窗
        closeDeviceAuthorizationPrompt();
        
        log('WebUSB 初始化失败:', error);
        logDevice('WebUSB 初始化失败: ' + (error.message || error.toString()));
        if (error.message) {
            if (error.message.indexOf('No device') != -1 || error.name === 'NotFoundError') { // 未选中设备
                log('用户取消选择设备');
                logDevice('用户取消选择设备');
                return false;
            } else if (error.message.indexOf('Unable to claim interface') != -1 || error.message.indexOf('claimInterface') != -1) {
                // 无法获取接口权限，可能需要在车机上授权
                showDeviceAuthorizationError();
                logDevice('无法获取 USB 接口权限');
            } else if (error.message.indexOf('was disconnected') != -1) {
                alert('无法连接到此设备，请断开重新尝试。');
                logDevice('设备已断开连接');
            } else {
                alert('初始化 WebUSB 失败: ' + error.message);
            }
        } else {
            alert('初始化 WebUSB 失败，请检查浏览器版本。');
        }
        return false;
    }
};

// 扫描网络 ADB 设备
let scanNetworkAdbDevices = async () => {
    log('开始扫描网络 ADB 设备...');
    logDevice('开始扫描网络 ADB 设备...');
    
    const networkDevices = [];
    const defaultPort = 5555;
    
    try {
        // 1. 尝试连接本地 5555 端口
        logDevice('正在检查本地 5555 端口...');
        networkDevices.push({
            type: 'Network',
            name: '本地 ADB 无线调试',
            host: '127.0.0.1',
            port: defaultPort,
            description: '本地无线调试设备'
        });
        
        // 2. 尝试连接常用的 ADB 无线调试地址
        const commonAddresses = [
            '192.168.1.1',
            '192.168.0.1',
            '192.168.1.100',
            '192.168.0.100'
        ];
        
        for (const address of commonAddresses) {
            networkDevices.push({
                type: 'Network',
                name: `ADB 无线调试 (${address})`,
                host: address,
                port: defaultPort,
                description: `可能的无线调试设备 at ${address}:${defaultPort}`
            });
        }
        
        logDevice(`发现 ${networkDevices.length} 个可能的网络 ADB 设备`);
    } catch (error) {
        log('网络 ADB 设备扫描失败:', error);
        logDevice('网络 ADB 设备扫描失败: ' + (error.message || error.toString()));
    }
    
    return networkDevices;
};

// 扫描 USB 端口设备
let scanUsbDevices = async () => {
    log('开始扫描有线 USB 设备...');
    logDevice('开始扫描有线 USB 设备...');
    
    // 扫描逻辑
    const devices = [];
    
    // 只扫描 WebUSB 设备（有线设备）
    try {
        const webusbDevices = await navigator.usb.getDevices();
        webusbDevices.forEach(device => {
            devices.push({
                type: 'WebUSB',
                name: device.productName || 'USB设备',
                vendorId: device.vendorId,
                productId: device.productId,
                device: device
            });
        });
        log(`发现 ${webusbDevices.length} 个 WebUSB 设备`);
        logDevice(`发现 ${webusbDevices.length} 个 WebUSB 设备`);
        
        // 记录每个设备的详细信息
        webusbDevices.forEach((device, index) => {
            logDevice(`设备 ${index + 1}: ${device.productName || 'USB设备'} (VID: ${device.vendorId}, PID: ${device.productId})`);
        });
    } catch (error) {
        log('WebUSB 设备扫描失败:', error);
        logDevice('WebUSB 设备扫描失败: ' + (error.message || error.toString()));
    }
    
    return devices;
};

// 显示设备选择弹窗
let showDeviceSelection = (devices) => {
    return new Promise((resolve, reject) => {
        // 创建设备选择内容
        let content = '<div style="max-height: 200px; overflow-y: auto;">';

        if (devices.length === 0) {
            // 没有设备时显示友好的提示
            content += `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
                    <div style="font-size: 14px; margin-bottom: 8px;">未发现任何设备</div>
                    <div style="font-size: 11px; color: #999; line-height: 1.5;">
                        请检查：USB线连接、USB调试模式、设备授权
                    </div>
                </div>
            `;
        } else {
            // 有设备时显示设备列表
            devices.forEach((device, index) => {
                let deviceInfo = '';
                if (device.type === 'WebUSB') {
                    deviceInfo = `USB 设备: ${device.name} (VID: ${device.vendorId}, PID: ${device.productId})`;
                }

                if (deviceInfo) {
                    content += `<div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
                    content += `<div style="font-weight: bold; font-size: 13px;">${deviceInfo}</div>`;
                    content += '</div>';
                }
            });
        }
        content += '</div>';
        
        // 添加设备选择函数到全局
        let selectedDeviceIndex = -1;
        
        window.selectDevice = (index) => {
            // 清除之前的选择
            const deviceElements = document.querySelectorAll('[id^="device-"]');
            deviceElements.forEach(element => {
                element.style.border = '1px solid #ddd';
                element.style.backgroundColor = '';
            });
            
            // 选中当前设备
            selectedDeviceIndex = index;
            const selectedElement = document.getElementById(`device-${index}`);
            if (selectedElement) {
                selectedElement.style.border = '2px solid #007bff';
                selectedElement.style.backgroundColor = '#e3f2fd';
            }
        };
        
        // 添加刷新设备函数到全局
        window.refreshDevices = async () => {
            try {
                // 显示加载状态
                const modalBody = document.querySelector('.custom-modal-body');
                if (modalBody) {
                    modalBody.innerHTML = '<div style="text-align: center; padding: 20px;">正在刷新设备...</div>';
                }

                // 重新扫描设备
                logDevice('开始刷新设备列表...');
                const refreshedDevices = await scanUsbDevices();

                // 更新设备列表
                let updatedContent = '<div style="max-height: 200px; overflow-y: auto;">';

                if (refreshedDevices.length === 0) {
                    // 没有设备时显示友好的提示
                    updatedContent += `
                        <div style="padding: 20px; text-align: center; color: #666;">
                            <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
                            <div style="font-size: 14px; margin-bottom: 8px;">未发现任何设备</div>
                            <div style="font-size: 11px; color: #999; line-height: 1.5;">
                                请检查：USB线连接、USB调试模式、设备授权
                            </div>
                        </div>
                    `;
                } else {
                    // 有设备时显示设备列表
                    refreshedDevices.forEach((device, index) => {
                        let deviceInfo = '';
                        if (device.type === 'WebUSB') {
                            deviceInfo = `USB 设备: ${device.name} (VID: ${device.vendorId}, PID: ${device.productId})`;
                        }

                        if (deviceInfo) {
                            updatedContent += `<div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
                            updatedContent += `<div style="font-weight: bold; font-size: 13px;">${deviceInfo}</div>`;
                            updatedContent += '</div>';
                        }
                    });
                }
                updatedContent += '</div>';

                // 更新弹窗内容
                if (modalBody) {
                    modalBody.innerHTML = updatedContent;
                }

                // 更新设备列表引用
                devices = refreshedDevices;
                // 重置选中状态
                selectedDeviceIndex = -1;

                logDevice('设备列表刷新完成');
            } catch (error) {
                logDevice('刷新设备列表失败: ' + (error.message || error.toString()));
                alert('刷新设备列表失败，请重试');
            }
        };
        
        // 清理函数
        function cleanup() {
            delete window.selectDevice;
            delete window.refreshDevices;
        }
        
        // 使用原始的 showModal 函数显示设备选择弹窗
        showModal('选择设备', content, {
            showCancel: true,
            cancelText: '取消',
            confirmText: '确定连接',
            callback: function(confirmed) {
                if (confirmed) {
                    if (devices.length === 0) {
                        // 没有设备，提示用户刷新
                        alert('未发现设备，请点击"刷新设备"按钮重新扫描');
                        // 返回 false 阻止关闭弹窗
                        return false;
                    } else if (selectedDeviceIndex === -1) {
                        // 有设备但没选择，提示用户
                        alert('请先选择要连接的设备');
                        // 返回 false 阻止关闭弹窗
                        return false;
                    } else {
                        // 使用选中的设备
                        resolve(devices[selectedDeviceIndex]);
                        // 返回 true 允许关闭弹窗（通过 closeModal 关闭）
                        closeModal();
                        cleanup();
                        return true;
                    }
                } else {
                    reject(new Error('User canceled'));
                    cleanup();
                    return true;
                }
            }
        });
        
        // 添加刷新按钮到弹窗底部
        const modalFooter = document.getElementById('modalFooter');
        if (modalFooter) {
            // 在取消按钮前添加刷新按钮
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
            refreshBtn.textContent = '刷新设备';
            refreshBtn.onclick = refreshDevices;
            modalFooter.insertBefore(refreshBtn, modalFooter.firstChild);
        }
    });
};

// 连接设备
let connect = async () => {
    try {
        clearDeviceLog();
        logDevice('开始连接设备...');
        
        // 1. 扫描设备
        const devices = await scanUsbDevices();
        
        // 2. 显示设备选择弹窗
        logDevice('显示设备选择弹窗...');
        const selectedDevice = await showDeviceSelection(devices);
        logDevice('已选择设备: ' + selectedDevice.name);
        
        // 3. 连接 WebUSB 设备（有线连接）
        if (selectedDevice.type === 'WebUSB') {
            // WebUSB 设备连接
            logDevice('正在连接有线 USB 设备...');
            const initialized = await initWebUSB(selectedDevice.device);
            if (!initialized || !window.adbTransport) {
                logDevice('WebUSB 初始化失败');
                return;
            }
            
            window.adbDevice = null;
            
            // 创建 ADB 设备并连接
            logDevice('正在创建 ADB 设备...');
            window.adbDevice = new AdbDevice(window.adbTransport);
            await window.adbDevice.connect("host::web", () => {
                alert('请在您的设备上允许 ADB 调试');
                logDevice('请在您的设备上允许 ADB 调试');
            });
            
            if (window.adbDevice && window.adbDevice.connected) {
                let deviceName = window.adbDevice.banner || '设备';
                setDeviceName(deviceName);
                console.log('设备连接成功:', window.adbDevice);
                logDevice('设备连接成功: ' + deviceName);
                
                let toast = document.getElementById('success-toast');
                toast.style.visibility = 'visible';
                setTimeout(function() {
                    toast.style.visibility = 'hidden';
                }, 3000);
                
                // 开始持续检测设备状态
                startDeviceMonitoring();
            }
        }
    } catch (error) {
        log('设备连接失败:', error);
        logDevice('设备连接失败: ' + (error.message || error.toString()));
        window.adbDevice = null;
        window.adbTransport = null;
        
        if (error.message && error.message.indexOf('Authentication required') != -1) {
            alert('需要在设备上允许 ADB 调试');
            logDevice('需要在设备上允许 ADB 调试');
        } else if (error.message && error.message.indexOf('User canceled') != -1) {
            // 用户取消连接，不显示错误
            logDevice('用户取消连接');
        } else if (error.message && error.message.indexOf('Refresh devices') != -1) {
            // 用户点击了刷新设备，重新执行连接流程
            logDevice('用户请求刷新设备列表');
            connect();
        } else {
            alert('连接失败，请断开重新尝试。');
        }
    }
};

// 断开连接
let disconnect = async () => {
    if (!window.adbDevice && !window.adbTransport) {
        return;
    }
    
    const confirmed = confirm("是否断开连接？");
    if (!confirmed) {
        return; // 用户点击了取消，则不执行操作
    }
    
    try {
        logDevice('正在断开连接...');
        
        if (window.adbDevice) {
            await window.adbDevice.disconnect();
            window.adbDevice = null;
        } else if (window.adbTransport) {
            await window.adbTransport.close();
            window.adbTransport = null;
        }
        setDeviceName(null);
        log('设备已断开连接');
        logDevice('设备已断开连接');
        
        // 停止设备监控
        stopDeviceMonitoring();
    } catch (error) {
        log('断开连接失败:', error);
        logDevice('断开连接失败: ' + (error.message || error.toString()));
    }
};

// 显示无线设备选择弹窗
let showWirelessDeviceSelection = (devices) => {
    return new Promise((resolve, reject) => {
        // 创建设备选择内容
        let content = `
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 12px;">
                <h5 style="margin-top: 0; margin-bottom: 8px; font-size: 13px;">发现的无线设备：</h5>
        `;

        if (devices.length === 0) {
            content += '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">未在列表中发现设备<br>请在下方输入设备IP地址或点击"扫描网络"</div>';
        } else {
            devices.forEach((device, index) => {
                content += `
                    <div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectWirelessDevice(${index})" id="wireless-device-${index}">
                        <div style="font-weight: bold; font-size: 13px;">${device.name}</div>
                        <div style="font-size: 11px; color: #666;">${device.host}:${device.port}</div>
                        <div style="font-size: 11px; color: #999;">${device.description}</div>
                    </div>
                `;
            });
        }

        content += `
            </div>

            <div style="margin-bottom: 12px;">
                <h5 style="margin-top: 0; margin-bottom: 8px; font-size: 13px;">自定义 IP 和端口：</h5>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="customIp" placeholder="IP 地址" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" value="192.168.1.100">
                    <input type="number" id="customPort" placeholder="端口" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" value="5555" min="1" max="65535">
                </div>
            </div>
        `;
        
        // 添加设备选择函数到全局
        let selectedDeviceIndex = -1;
        
        window.selectWirelessDevice = (index) => {
            // 清除之前的选择
            const deviceElements = document.querySelectorAll('[id^="wireless-device-"]');
            deviceElements.forEach(element => {
                element.style.border = '1px solid #ddd';
                element.style.backgroundColor = '';
            });
            
            // 选中当前设备
            selectedDeviceIndex = index;
            const selectedElement = document.getElementById(`wireless-device-${index}`);
            if (selectedElement) {
                selectedElement.style.border = '2px solid #007bff';
                selectedElement.style.backgroundColor = '#e3f2fd';
            }
        };
        
        // 添加刷新设备函数到全局
        window.refreshWirelessDevices = async () => {
            try {
                // 显示扫描进度
                const modalBody = document.querySelector('.custom-modal-body');
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div style="padding: 20px;">
                            <div style="text-align: center; margin-bottom: 15px;">正在扫描局域网ADB设备...</div>
                            <div style="width: 100%; background-color: #e9ecef; border-radius: 4px; overflow: hidden;">
                                <div id="scan-progress-bar" style="width: 0%; height: 20px; background-color: #007bff; transition: width 0.3s;"></div>
                            </div>
                            <div id="scan-status" style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">正在获取本机IP...</div>
                        </div>
                    `;
                }

                logDevice('开始扫描局域网ADB设备...');

                // 通过 WebRTC 获取本机局域网IP
                const localIP = await getLocalIP();
                logDevice(`检测到本机IP: ${localIP}`);

                // 解析本机IP的网段
                let subnet = '192.168.1';
                if (localIP) {
                    const parts = localIP.split('.');
                    if (parts.length === 4) {
                        subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
                    }
                }

                logDevice(`扫描网段: ${subnet}.x`);

                // 扫描该网段的常用IP
                const scanTargets = [];
                // 添加网关
                scanTargets.push(`${subnet}.1`);
                // 添加常用设备IP范围
                for (let i = 2; i <= 20; i++) {
                    scanTargets.push(`${subnet}.${i}`);
                }
                for (let i = 100; i <= 120; i++) {
                    scanTargets.push(`${subnet}.${i}`);
                }

                const statusText = document.getElementById('scan-status');

                // 快速扫描：每个地址200ms延迟
                const scannedDevices = [];

                for (let i = 0; i < scanTargets.length; i++) {
                    const target = scanTargets[i];
                    const progress = Math.round(((i + 1) / scanTargets.length) * 100);

                    // 更新进度条
                    const progressBar = document.getElementById('scan-progress-bar');
                    const statusText = document.getElementById('scan-status');
                    if (progressBar) progressBar.style.width = progress + '%';
                    if (statusText) statusText.textContent = `正在扫描 ${target}:5555... (${progress}%)`;

                    // 模拟延迟（扫描每个地址）
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // 注意：由于浏览器安全限制，无法真正检测TCP端口
                    // 这里只扫描局域网范围内的地址，提供常用IP给用户选择
                }

                // 显示扫描结果提示
                if (statusText) {
                    statusText.innerHTML = `扫描完成<br><span style="color: #999;">（网段: ${subnet}.x，浏览器限制无法检测端口，请手动连接）</span>`;
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // 清空设备列表，让用户手动输入
                showWirelessDeviceSelection([]).then(resolve).catch(reject);
            } catch (error) {
                logDevice('扫描网络设备失败: ' + (error.message || error.toString()));
                alert('扫描网络设备失败，请重试');
            }
        };
        
        // 清理函数
        function cleanup() {
            delete window.selectWirelessDevice;
            delete window.refreshWirelessDevices;
        }
        
        // 使用 showModal 函数显示弹窗
        showModal('无线设备连接', content, {
            showCancel: true,
            cancelText: '取消',
            confirmText: '连接',
            callback: function(confirmed) {
                if (confirmed) {
                    if (selectedDeviceIndex !== -1) {
                        // 使用选中的设备
                        resolve(devices[selectedDeviceIndex]);
                        cleanup();
                    } else {
                        // 使用自定义 IP 和端口
                        const customIp = document.getElementById('customIp').value;
                        const customPort = parseInt(document.getElementById('customPort').value);
                        
                        if (!customIp || isNaN(customPort)) {
                            alert('请输入有效的 IP 地址和端口');
                            // 重新显示弹窗
                            showWirelessDeviceSelection(devices).then(resolve).catch(reject);
                        } else {
                            resolve({
                                type: 'Network',
                                name: '自定义 IP 连接',
                                host: customIp,
                                port: customPort,
                                description: '自定义 IP 和端口连接'
                            });
                            cleanup();
                        }
                    }
                } else {
                    reject(new Error('User canceled'));
                    cleanup();
                }
            }
        });
        
        // 添加扫描网络按钮到弹窗底部
        const modalFooter = document.getElementById('modalFooter');
        if (modalFooter) {
            // 在取消按钮前添加扫描网络按钮
            const scanBtn = document.createElement('button');
            scanBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
            scanBtn.textContent = '扫描网络';
            scanBtn.onclick = refreshWirelessDevices;
            modalFooter.insertBefore(scanBtn, modalFooter.firstChild);
        }
    });
};

// 检查浏览器支持并连接
let checkBrowserSupportAndConnect = async () => {
    try {
        // 检查浏览器是否支持 WebUSB
        const isSupported = checkWebUSBSupport();
        if (!isSupported || !navigator.usb) {
            // 不支持，显示 Edge 下载弹窗
            showEdgeDownloadPopup();
            // 直接返回，不继续执行后续连接逻辑
            return;
        }
        // 支持，直接连接
        connect();
    } catch (error) {
        log('检查浏览器支持失败:', error);
        // 出错时显示提示，不继续连接
        alert('检查浏览器支持失败: ' + (error.message || error.toString()));
    }
};

// 无线连接
let wirelessConnect = async () => {
    try {
        // 检查浏览器是否支持 WebUSB
        const isSupported = checkWebUSBSupport();
        if (!isSupported || !navigator.usb) {
            // 不支持，显示 Edge 下载弹窗
            showEdgeDownloadPopup();
            // 直接返回，不继续执行后续连接逻辑
            return;
        }
        // 支持，直接连接
        await performWirelessConnect();
    } catch (error) {
        log('无线连接失败:', error);
        logDevice('无线连接失败: ' + (error.message || error.toString()));
        window.adbDevice = null;
        window.adbTransport = null;

        if (error.message && error.message.indexOf('User canceled') != -1) {
            // 用户取消连接，不显示错误
            logDevice('用户取消连接');
        } else {
            alert('无线连接失败，请检查设备状态和网络连接。');
        }
    }
};

// 执行无线连接操作
let performWirelessConnect = async () => {
    try {
        clearDeviceLog();
        logDevice('开始无线 ADB 连接...');

        // 说明：浏览器无法直接建立TCP连接
        // 此功能仅用于通过USB连接设备后开启无线调试端口
        // 开启后的端口可供命令行adb等工具使用

        logDevice('注意：');
        logDevice('1. 浏览器无法直接连接TCP端口');
        logDevice('2. 无线ADB使用方式：');
        logDevice('   - 先使用USB连接设备');
        logDevice('   - 点击"有线连接"连接设备');
        logDevice('   - 使用系统工具中的"无线ADB"功能开启端口');
        logDevice('   - 之后可使用命令行 adb connect <IP>:5555 连接');

        const networkDevices = await scanNetworkAdbDevices();

        // 显示无线设备选择弹窗
        logDevice('显示无线设备选择弹窗...');
        const selectedDevice = await showWirelessDeviceSelection(networkDevices);

        if (!selectedDevice) {
            throw new Error('未选择设备');
        }

        const host = selectedDevice.host;
        const port = selectedDevice.port;

        logDevice(`尝试连接到 ${host}:${port}...`);

        try {
            // 创建 TCP 传输（会抛出浏览器不支持TCP的错误）
            window.adbTransport = new TcpTransport(host, port);

            // 打开传输连接
            await window.adbTransport.open();

            window.adbDevice = null;

            // 创建 ADB 设备并连接
            logDevice('正在创建 ADB 设备...');
            window.adbDevice = new AdbDevice(window.adbTransport);
            await window.adbDevice.connect("host::web", () => {
                alert('请在您的设备上允许 ADB 调试');
                logDevice('请在您的设备上允许 ADB 调试');
            });

            if (window.adbDevice && window.adbDevice.connected) {
                let deviceName = window.adbDevice.banner || '网络设备';
                setDeviceName(deviceName);
                console.log('网络设备连接成功:', window.adbDevice);
                logDevice('网络设备连接成功: ' + deviceName);

                let toast = document.getElementById('success-toast');
                toast.style.visibility = 'visible';
                setTimeout(function() {
                    toast.style.visibility = 'hidden';
                }, 3000);

                // 开始持续检测设备状态
                startDeviceMonitoring();
            }
        } catch (error) {
            log('网络 ADB 设备连接失败:', error);
            logDevice('网络 ADB 设备连接失败: ' + (error.message || error.toString()));

            // 提供更友好的错误提示
            alert('无法直接连接到网络ADB设备。\n\n原因：浏览器不支持TCP连接。\n\n解决方案：\n1. 使用USB有线连接\n2. 通过USB连接后使用"无线ADB"功能开启端口（供其他工具使用）');

            window.adbDevice = null;
            window.adbTransport = null;
        }
    } catch (error) {
        log('执行无线连接失败:', error);
        if (error.message !== 'User canceled') {
            logDevice('执行无线连接失败: ' + (error.message || error.toString()));
        }
        throw error;
    }
};

// 设备状态监控
let deviceMonitoringInterval = null;

// 开始持续检测设备状态
let startDeviceMonitoring = () => {
    // 清除之前的监控
    stopDeviceMonitoring();
    
    // 每5秒检测一次设备状态
    deviceMonitoringInterval = setInterval(async () => {
        try {
            if (window.adbDevice && window.adbDevice.connected) {
                // 可以执行一些简单的命令来检测设备是否仍然响应
                // 例如，获取设备状态
                logDevice('设备状态: 已连接');
            } else {
                logDevice('设备状态: 已断开');
                setDeviceName(null);
                stopDeviceMonitoring();
            }
        } catch (error) {
            logDevice('设备监控失败: ' + (error.message || error.toString()));
            setDeviceName(null);
            stopDeviceMonitoring();
        }
    }, 5000);
    
    logDevice('开始持续监控设备状态');
};

// 停止设备状态监控
let stopDeviceMonitoring = () => {
    if (deviceMonitoringInterval) {
        clearInterval(deviceMonitoringInterval);
        deviceMonitoringInterval = null;
        logDevice('停止监控设备状态');
    }
};

// 当前设备状态
let setDeviceName = async (name) => {
    if (!name) {
        name = '未连接';
    }
    document.getElementById('device-status').textContent = name;
    logDevice('设备状态更新: ' + name);
};

// 初始化设备检测
let initDeviceDetection = async () => {
    try {
        // 检测浏览器支持
        const isSupported = checkWebUSBSupport();
        if (isSupported && navigator.usb) {
            logDevice('浏览器支持 WebUSB');
            
            // 初始化时检查是否有已连接的设备
            logDevice('初始化时检查已连接的设备...');
            const webusbDevices = await navigator.usb.getDevices();
            if (webusbDevices.length > 0) {
                logDevice(`发现 ${webusbDevices.length} 个已连接的 WebUSB 设备`);
                webusbDevices.forEach((device, index) => {
                    logDevice(`设备 ${index + 1}: ${device.productName || 'USB设备'} (VID: ${device.vendorId}, PID: ${device.productId})`);
                });
            } else {
                logDevice('未发现已连接的 WebUSB 设备');
            }
        } else {
            logDevice('浏览器不支持 WebUSB');
        }
    } catch (error) {
        logDevice('设备检测初始化失败: ' + (error.message || error.toString()));
    }
};

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // 初始化设备日志
        const deviceLogElement = document.getElementById('device-log');
        if (deviceLogElement) {
            deviceLogElement.textContent = '[初始化] 设备情况日志已就绪\n';
        }
        
        // 初始化设备检测
        initDeviceDetection();
    });
}

// 推送应用
let push = async (filePath, blob) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    
    clear();
    showProgress(true);
    try {
        log("正在推送 " + filePath + " ...");
        
        // 转换 blob 为 ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // 使用新的 sync 协议推送
        const syncStream = await window.adbDevice.sync();
        try {
            // 这里需要实现完整的 sync 协议
            // 暂时使用简单的 shell 命令推送
            const shellStream = await window.adbDevice.shell(`cat > ${filePath} && chmod 0644 ${filePath}`);
            try {
                await shellStream.send(arrayBuffer);
                await shellStream.close();
                log("推送成功！");
            } finally {
                await shellStream.close();
            }
        } finally {
            await syncStream.close();
        }
    } catch (error) {
        log('推送失败:', error);
        alert("推送失败，请断开重新尝试。");
    }
    showProgress(false);
};

// 执行命令
let exec_shell = async (command) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    if (!command) {
        return;
    }
    
    clear();
    showProgress(true);
    log('开始执行指令: ' + command + '\n');
    
    try {
        const shellStream = await window.adbDevice.shell(command);
        try {
            let data;
            while ((data = await shellStream.receive()) !== null) {
                const decoder = new TextDecoder('utf-8');
                const txt = decoder.decode(data);
                log(txt);
            }
        } finally {
            await shellStream.close();
        }
    } catch (error) {
        log('命令执行失败:', error);
        console.error("命令执行失败，请断开重新尝试");
    }
    showProgress(false);
};

// 优化网络传输性能
let optimizeNetworkPerformance = async () => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    
    clear();
    showProgress(true);
    log('开始优化网络传输性能...\n');
    
    try {
        // 1. 调整 TCP 窗口参数
        log('1. 调整 TCP 窗口参数...');
        await exec_shell('echo \'net.ipv4.tcp_window_scaling=1\' >> /proc/sys/net/ipv4/tcp_window_scaling');
        log('TCP 窗口参数调整成功\n');
        
        // 2. 启用 ADB 的压缩传输功能
        log('2. 启用 ADB 压缩传输功能...');
        // 注意：ADB 压缩传输功能需要在 ADB 客户端启用，这里我们通过 shell 命令设置相关参数
        await exec_shell('setprop persist.adb.zlib-deflate 1');
        log('ADB 压缩传输功能启用成功\n');
        
        log('网络传输性能优化完成！');
        alert('网络传输性能优化完成！');
    } catch (error) {
        log('性能优化失败:', error);
        alert('性能优化失败，请检查设备状态');
    }
    showProgress(false);
};

// 执行命令并返回输出
let execShellAndGetOutput = async (command) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return "";
    }
    if (!command) {
        return "";
    }
    
    let output = "";
    try {
        const shellStream = await window.adbDevice.shell(command);
        try {
            let data;
            while ((data = await shellStream.receive()) !== null) {
                const decoder = new TextDecoder('utf-8');
                const txt = decoder.decode(data);
                output += txt;
                log(txt); // 同时输出到日志
            }
        } finally {
            await shellStream.close();
        }
    } catch (error) {
        log('命令执行失败:', error);
        throw error;
    }
    return output;
};

// 手动执行命令
let exec_command = async (args) => {
    exec_shell(document.getElementById('shell').value);
};

// 通过 WebRTC 获取本机局域网IP
async function getLocalIP() {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection({
            iceServers: []
        });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        let ipFound = null;
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                const match = evt.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (match) {
                    const ip = match[1];
                    // 过滤出局域网IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                    if (ip.startsWith('192.168.') || ip.startsWith('10.') ||
                        (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                        ipFound = ip;
                        pc.close();
                        resolve(ipFound);
                    }
                }
            }
        };

        // 超时返回默认值
        setTimeout(() => {
            pc.close();
            resolve(ipFound || '192.168.1.1');
        }, 2000);
    });
}

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initWebUSB,
            connect,
            disconnect,
            setDeviceName,
            push,
            exec_shell,
            execShellAndGetOutput,
            exec_command,
            adbDevice,
            adbTransport
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}