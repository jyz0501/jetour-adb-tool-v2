// 设备连接管理模块 - V2
// adb 和 webusb 变量在 utils.js 中声明

// 初始化 WebUSB
let init = async () => {
	if(!navigator.usb) {
		log("您的浏览器不支持 WebUSB 功能，请使用 Edge 浏览器");
		return null;
	}

	clear();
	try {
		webusb = await Adb.open("WebUSB");
		return webusb;
	} catch(error) {
		if (error.message) {
			if(error.message.indexOf('No device') != -1) {
				log("未选择设备");
				return null;
			}else if(error.message.indexOf('was disconnected') != -1) {
				log('无法连接到此设备, 请尝试重新连接');
				return null;
			}
		}
		log(error);
		return null;
	}
};

// 自动连接设备函数
let autoConnect = async () => {
	// 如果已连接，直接返回
	if (adb) {
		return true;
	}

	// 初始化 WebUSB
	webusb = await init();
	if (!webusb) {
		log("未检测到设备，请连接设备后重试");
		return false;
	}

	// 检查是否是 ADB 设备
	if (webusb.isAdb()) {
		log('检测到设备，等待设备初始化...');
		await new Promise(resolve => setTimeout(resolve, 1500));

		// 尝试连接，最多重试3次
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				// 先尝试断开现有连接
				if (adb) {
					try {
						adb.close();
					} catch (e) {
						// 忽略断开连接时的错误
					}
				}
				adb = null;

				log(`正在连接设备... (第${attempt}次尝试)`);
				adb = await webusb.connectAdb(() => {
					log('请在你的 ' + webusb.device.productName + ' 设备上允许 ADB 调试');
				});

				if (adb != null) {
					console.log(webusb.device);
					log('设备连接成功');
					return true;
				}
			} catch(error) {
				if (attempt < 3) {
					log(`连接失败，正在重试...`);
					await new Promise(resolve => setTimeout(resolve, 1000));
				} else {
					log('连接失败，请检查并断开其他 ADB 软件连接');
					return false;
				}
			}
		}
	}
	return false;
};

// 手动连接设备
let connect = async () => {
	return await autoConnect();
};

// 断开连接
let disconnect = async () => {
	if (!webusb) {
		return;
	}

	try {
		webusb.close();
	} catch (e) {
		console.error("断开连接时出错:", e);
	}

	adb = null;
	webusb = null;
	log("已断开设备连接");
	updateDeviceStatus('未连接');
};

// 检查浏览器支持并连接
async function checkBrowserSupportAndConnect() {
	if (!navigator.usb) {
		showEdgeDownloadPopup();
		return;
	}

	updateDeviceLog("正在请求设备访问...");
	const success = await connect();
	if (success) {
		updateDeviceLog("设备已连接");
		updateDeviceStatus('已连接');
		showToast("设备连接成功！");
	} else {
		updateDeviceLog("连接失败");
		updateDeviceStatus('未连接');
	}
}

// 更新设备日志
function updateDeviceLog(message) {
	const deviceLog = document.getElementById('device-log');
	if (deviceLog) {
		const timestamp = new Date().toLocaleTimeString();
		deviceLog.textContent = `[${timestamp}] ${message}`;
	}
}

// 更新设备状态
function updateDeviceStatus(status) {
	const deviceStatus = document.getElementById('device-status');
	if (deviceStatus) {
		deviceStatus.textContent = status;
		if (status === '已连接') {
			deviceStatus.style.color = '#28a745';
		} else {
			deviceStatus.style.color = '#dc3545';
		}
	}
}

// 显示提示框
function showToast(message) {
	const toast = document.getElementById('success-toast');
	if (toast) {
		toast.textContent = message;
		toast.style.display = 'block';
		setTimeout(() => {
			toast.style.display = 'none';
		}, 3000);
	}
}

// 显示 Edge 浏览器下载弹窗
function showEdgeDownloadPopup() {
	document.getElementById('modalTitle').textContent = '提示';
	document.getElementById('modalBody').innerHTML = `
		<p>您的浏览器不支持 WebUSB 功能。</p>
		<p>请使用 Edge 浏览器打开此页面以使用 WebUSB 连接功能。</p>
		<p><a href="https://www.microsoft.com/edge" target="_blank">下载 Edge 浏览器</a></p>
	`;
	document.getElementById('modalFooter').innerHTML = `
		<button class="custom-modal-btn custom-modal-btn-secondary" onclick="closeModal()">关闭</button>
	`;
	document.getElementById('customModal').style.display = 'block';
}

// 检查浏览器 WebUSB 支持
function checkWebUSBSupport() {
	const usbWarning = document.getElementById('usb-warning');
	const connectBtn = document.getElementById('connect-btn');

	if (navigator.usb) {
		if (usbWarning) usbWarning.style.display = 'none';
		if (connectBtn) connectBtn.disabled = false;
		updateDeviceLog("浏览器支持 WebUSB");
	} else {
		if (usbWarning) {
			usbWarning.style.display = 'block';
			usbWarning.style.color = '#dc3545';
		}
		if (connectBtn) connectBtn.disabled = true;
		updateDeviceLog("浏览器不支持 WebUSB，请使用 Edge 浏览器");
	}
}

// 页面加载完成后检查浏览器支持
window.addEventListener('DOMContentLoaded', function() {
	checkWebUSBSupport();
});

// 模拟键盘输入
let simulateKeyboardInput = async () => {
    openLogWindow();
    clear();
    // 自动连接设备
    if (!await autoConnect()) {
        return;
    }
    let inputText = $('#inputText').val();
    if (!inputText) {
        log("请输入要模拟输入的文本");
        return;
    }
    showProgress(true);
    try {
        await exec_shell(`input text "${inputText}"`);
        log("文本已发送到设备");
    } catch (error) {
        log("发送失败");
    }
    showProgress(false);
};

//安装并激活权限狗
let qxg = async () => {
    openLogWindow();
    clear();
    if (!await autoConnect()) {
        return;
    }
    let apkFilePath = "/data/local/tmp/qxg.apk";
    let scriptFilePath = "/data/local/tmp/qxg.sh";
    let shellInstall = "pm install -g -r " + apkFilePath;
    let shellSetProp = "setprop persist.sv.enable_adb_install 1";
    let shellDisableAdbInstall = "setprop persist.sv.enable_adb_install 0";
    let shellExecuteScript = "sh " + scriptFilePath;
    try {
        log("开始安装并激活权限狗...");
        showProgress(true, 0, '正在下载权限狗...');
        log("正在下载权限狗APK...");
        let apkResponse = await fetch('/apk/qxg.apk');
        if (!apkResponse.ok) throw new Error('网络响应不正常');
        let apkFileBlob = await apkResponse.blob();
        let apkFile = new File([apkFileBlob], "qxg.apk", { type: "application/vnd.android.package-archive" });
        showProgress(true, 20, '正在推送权限狗到设备...');
        await push(apkFilePath, apkFile, null, false, '权限狗');
        showProgress(true, 40, '正在设置系统属性...');
        await exec_shell(shellSetProp, true);
        showProgress(true, 60, '正在安装权限狗...');
        let installResult = '';
        let shell = await adb.shell(shellInstall);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            installResult += decoder.decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        if (installResult.includes('Success') || installResult.includes('success')) {
            log("权限狗安装成功，正在下载激活脚本...");
            showProgress(true, 80, '正在下载激活脚本...');
            log("正在下载激活脚本...");
            let scriptResponse = await fetch('/apk/qxg.sh');
            if (!scriptResponse.ok) throw new Error('激活脚本下载失败');
            let scriptFileBlob = await scriptResponse.blob();
            let scriptFile = new File([scriptFileBlob], "qxg.sh", { type: "text/plain" });
            showProgress(true, 90, '正在推送激活脚本...');
            await push(scriptFilePath, scriptFile, null, false, '激活脚本');
            await exec_shell("chmod 755 " + scriptFilePath);
            showProgress(true, 95, '正在激活权限狗...');
            await exec_shell(shellExecuteScript);
            await exec_shell(shellDisableAdbInstall, true);
            showProgress(true, 100, '安装完成');
            setTimeout(() => {
                showProgress(false);
                log("权限狗安装并激活成功！");
            }, 500);
        } else {
            showProgress(false);
            log("权限狗安装失败，请检查设备兼容性！");
        }
    } catch (error) {
        showProgress(false);
        log("安装过程中出现错误，请检查线材连接是否稳定或尝试刷新页面后重新安装！");
    }
}

//安装清风车机备用版
let qfcjgq = async () => {
    openLogWindow();
    clear();
    if (!await autoConnect()) {
        return;
    }
    let filePath = "/data/local/tmp/qfcjgq.apk";
    let shellInstall = "pm install -g -r " + filePath;
    let shellSetProp = "setprop persist.sv.enable_adb_install 1";
    let shellDisableAdbInstall = "setprop persist.sv.enable_adb_install 0";
    try {
        log("开始安装清风车机备用版...");
        showProgress(true, 0, '正在下载备用版...');
        log("正在下载备用版APK...");
        let response = await fetch('/apk/qfcjgq.apk');
        if (!response.ok) throw new Error('网络响应不正常');
        let fileBlob = await response.blob();
        let file = new File([fileBlob], "qfcjgq.apk", { type: "application/vnd.android.package-archive" });
        showProgress(true, 30, '正在推送备用版到设备...');
        await push(filePath, file, null, false, '备用版');
        showProgress(true, 60, '正在设置系统属性...');
        await exec_shell(shellSetProp, true);
        showProgress(true, 80, '正在安装备用版...');
        let installResult = '';
        let shell = await adb.shell(shellInstall);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            installResult += decoder.decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        if (installResult.includes('Success') || installResult.includes('success')) {
            log("备用版安装成功，正在启动清风车机助手...");
            await exec_shell('monkey -p qfapp.cccyn.cn -c android.intent.category.LAUNCHER 1', true);
            log("备用版安装成功，正在启用ADB连接...");
            await exec_shell(shellDisableAdbInstall, true);
            $('#tcpip').val(5555);
            await wifiAdb(true);
            showProgress(true, 100, '安装完成');
            setTimeout(() => {
                showProgress(false);
                log("清风车机备用版安装成功并已启用ADB连接！");
            }, 500);
        } else {
            showProgress(false);
            log("清风车机备用版安装失败，请检查设备兼容性！");
        }
    } catch (error) {
        showProgress(false);
        log("安装过程中出现错误，请检查线材连接是否稳定或尝试刷新页面后重新安装！");
    }
}

//安装清风车机福特定制版
let ftqfcj = async () => {
    openLogWindow();
    clear();
    if (!await autoConnect()) {
        return;
    }
    let filePath = "/data/local/tmp/qfcjgq.apk";
    let shellInstall = "pm install -g -r " + filePath;
    let shellSetProp = "setprop persist.sv.enable_adb_install 1";
    let shellDisableAdbInstall = "setprop persist.sv.enable_adb_install 0";
    try {
        log("开始安装清风车机福特定制版...");
        showProgress(true, 0, '正在下载福特定制版...');
        log("正在下载福特定制版APK...");
        let response = await fetch('/apk/qfcjgq.apk');
        if (!response.ok) throw new Error('网络响应不正常');
        let fileBlob = await response.blob();
        let file = new File([fileBlob], "qfcjgq.apk", { type: "application/vnd.android.package-archive" });
        showProgress(true, 30, '正在推送福特定制版到设备...');
        await push(filePath, file, null, false, '福特定制版');
        log("正在获取系统权限...");
        await new Promise(res => setTimeout(res, 2500));
        showProgress(true, 60, '正在设置系统属性...');
        await exec_shell(shellSetProp, true);
        log("正在尝试破解权限...");
        await new Promise(res => setTimeout(res, 3500));
        showProgress(true, 80, '正在安装福特定制版...');
        log("正在安装福特定制版...");
        let installResult = '';
        let shell = await adb.shell(shellInstall);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            installResult += decoder.decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        if (installResult.includes('Success') || installResult.includes('success')) {
            log("获取权限成功，准备激活...");
            await new Promise(res => setTimeout(res, 2000));
            log("福特定制版安装成功，正在授权...");
            // 授权指令
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.WRITE_SECURE_SETTINGS', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn WRITE_SETTINGS allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn REQUEST_INSTALL_PACKAGES allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn GET_USAGE_STATS allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn SYSTEM_ALERT_WINDOW allow', true);
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.DUMP', true);
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.READ_LOGS', true);
            log("福特定制版安装成功，正在启动清风车机助手...");
            await exec_shell('monkey -p qfapp.cccyn.cn -c android.intent.category.LAUNCHER 1', true);
            log("福特定制版安装成功，正在启用ADB连接...");
            await exec_shell(shellDisableAdbInstall, true);
            $('#tcpip').val(5555);
            await wifiAdb(true);
            showProgress(true, 100, '安装完成');
            setTimeout(() => {
                showProgress(false);
                log("清风车机福特定制版安装成功并已启用ADB连接！");
            }, 500);
        } else {
            showProgress(false);
            log("清风车机福特定制版安装失败，请检查设备兼容性！");
        }
    } catch (error) {
        showProgress(false);
        log("安装过程中出现错误，请检查线材连接是否稳定或尝试刷新页面后重新安装！");
    }
}

let exec_command = async (args) => {
	exec_shell($('#shell').val());
}

let setDeviceName = async (name) => {
	// 移除了设备名称显示功能
}

// 显示/隐藏进度条
let showProgress = (show, progress = 0, message = '') => {
	if (show) {
		$('.progress').show();
		if (progress > 0) {
			$('.progress-bar').css('width', progress + '%');
		}
	} else {
		$('.progress').hide();
		$('.progress-bar').css('width', '0%');
	}
};

// 无线ADB (占位，实际实现在 system.js)
let wifiAdb = async (enable) => {
	// wifiAdb 函数在 system.js 中定义
};

$(document).ready(function() {
	if (navigator.usb) {
		$('#nowebusb').hide();
	}

	setDeviceName(null);

	// Close popup when clicking overlay
	$('#log-overlay').click((e) => {
		if (e.target === e.currentTarget) {
			closeLogWindow(true);
		}
	});

	// Close popup with ESC key
	$(document).keydown((e) => {
		if (e.key === 'Escape') {
			closeLogWindow(true);
		}
	});

	// Initialize progress bar
	$('.progress').hide();
});

// 打开日志窗口
let openLogWindow = () => {
	$('#log-overlay').fadeIn(300);
	$('#log-window').show().css('display', 'flex');
	$('#log-window').addClass('popup-active');
};

// 关闭日志窗口
let closeLogWindow = (isManual = false) => {
	$('#log-window').removeClass('popup-active');
	$('#log-overlay').fadeOut(300);
	$('#log-window').fadeOut(300);

	if (isManual) {
		location.reload();
	}
};
