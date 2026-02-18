// 设备管理相关功能

// 点击检测提示
let initWebUSB = async () => {
    if (!navigator.usb) {
        alert("检测到您的浏览器不支持，请根据顶部的 "警告提示" 更换指定浏览器使用。");
        return;
    }
    clear();
    try {
        webusb = await Adb.open("WebUSB");
    } catch (error) {
        if (error.message) {
            if (error.message.indexOf('No device') != -1) { // 未选中设备
                return;
            } else if (error.message.indexOf('was disconnected') != -1) {
                alert('无法连接到此设备，请断开重新尝试。');
            }
        }
        log(error);
    }
};

// 连接设备
let connect = async () => {
    await initWebUSB();
    if (!webusb) {
        return;
    }
    try {
        adb = null;
        // 直接连接ADB，不使用isAdb()方法
        adb = await webusb.connectAdb("host::web1n", () => {
            alert('请在您的设备上允许 ADB 调试');
        });
        if (adb != null) {
            let name = webusb.device ? (webusb.device.productName || '设备') : '设备';
            setDeviceName(name + '.');
            console.log('设备连接成功:', webusb.device);
            let toast = document.getElementById('success-toast');
            toast.style.visibility = 'visible';
            setTimeout(function() {
                toast.style.visibility = 'hidden';
            }, 3000);
        }
    } catch (error) {
        log(error);
        adb = null;
        alert("连接失败，请断开重新尝试。");
    }
};

// 断开连接
let disconnect = async () => {
    if (!webusb) {
        return;
    }
    const confirmed = confirm("是否断开连接？");
    if (!confirmed) {
        return; // 用户点击了取消，则不执行操作
    }
    webusb.close();
    setDeviceName(null);
};

// 当前设备状态
let setDeviceName = async (name) => {
    if (!name) {
        name = '未连接';
    }
    document.getElementById('device-status').textContent = name;
};

// 推送应用
let push = async (filePath, blob) => {
    if (!adb) {
        alert("未连接到设备");
        return;
    }
    clear();
    showProgress(true);
    try {
        log("正在推送 " + filePath + " ...");
        sync = await adb.sync();
        await sync.push(blob, filePath, 0644, null);
        await sync.quit();
        sync = null;
        log("推送成功！");
    } catch (error) {
        log(error);
        alert("推送失败，请断开重新尝试。");
    }
    showProgress(false);
};

// 执行命令
let exec_shell = async (command) => {
    if (!adb) {
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
        let shell = await adb.shell(command);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            let txt = decoder.decode(r.data);
            log(txt);
            r = await shell.receive();
        }
        shell.close();
    } catch (error) {
        log(error);
        console.error("命令执行失败，请断开重新尝试");
    }
    showProgress(false);
};

// 执行命令并返回输出
let execShellAndGetOutput = async (command) => {
    if (!adb) {
        alert("未连接到设备");
        return "";
    }
    if (!command) {
        return "";
    }
    let output = "";
    try {
        let shell = await adb.shell(command);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            let txt = decoder.decode(r.data);
            output += txt;
            log(txt); // 同时输出到日志
            r = await shell.receive();
        }
        shell.close();
    } catch (error) {
        log(error);
        throw error;
    }
    return output;
};

// 手动执行命令
let exec_command = async (args) => {
    exec_shell(document.getElementById('shell').value);
};

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
            exec_command
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}