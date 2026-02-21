// 设备管理模块 - 使用 ya-webadb 简化实现
let adb = null;
let webusb = null;

// 日志输出
let log = (...args) => {
	if (args[0] instanceof Error) {
		console.error.apply(console, args);
	} else {
		console.log.apply(console, args);
	}
	
	// 检查是否是未连接到设备的消息
	if (args[0] === "未连接到设备") {
		$("#log").text("");
	}
	
	// 将日志输出到页面
	$("#log").text($("#log").text() + args.join(' ') + '\n');
};

// 初始化 WebUSB
let init = async () => {
	if (!navigator.usb) {
		log("您的浏览器不支持 WebUSB 功能，请使用 Edge 浏览器");
		return null;
	}
	
	try {
		webusb = await Adb.open("WebUSB");
		return webusb;
	} catch (error) {
		if (error.message) {
			if (error.message.indexOf('No device') != -1) {
				log("未选择设备");
			} else if (error.message.indexOf('was disconnected') != -1) {
				log('无法连接到此设备，请尝试重新连接');
			}
		}
		log(error);
		return null;
	}
};

// 自动连接设备
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
			} catch (error) {
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
	// 检查浏览器支持
	if (!navigator.usb) {
		log("您的浏览器不支持 WebUSB 功能，请使用 Edge 浏览器");
		return false;
	}
	
	// 尝试自动连接
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
};

// 清除日志
let clear = async () => {
	$('#log').text("");
	$('.progress').hide();
	$('.progress-bar').css('width', '0%');
};

// 执行 Shell 命令
let exec_shell = async (command, silent = false) => {
	if (!adb) {
		if (!silent) log("未连接到设备");
		return;
	}
	if (!command) {
		return;
	}
	$('.progress').show();

	if (!silent) log('正在执行指令...');
	try {
		let shell = await adb.shell(command);
		let r = await shell.receive();
		while (r.data != null) {
			let decoder = new TextDecoder('utf-8');
			let txt = decoder.decode(r.data);
			if (!silent) log(txt);
			r = await shell.receive();
		}
		shell.close();
	} catch (error) {
		if (!silent) log("执行指令失败");
	}
	$('.progress').hide();
};

// 推送文件到设备
let push = async (filePath, blob, on_progress = null, silent = false, desc = '') => {
	if (!adb) {
		if (!silent) log("未连接到设备");
		return;
	}
	$('.progress').show();

	if (!silent) log("正在推送文件");

	try {
		let sync = await adb.sync();
		await sync.push(blob, filePath, 0o644, (count, total) => {
			let progress = Math.round((count / total) * 100);
			$('.progress-bar').css('width', progress + '%');
			if (on_progress) on_progress(count, total);
		});
		await sync.quit();
		sync = null;
		if (!silent) {
			if (desc) {
				log(`正在安装${desc}`);
			} else {
				log("文件推送完成");
			}
		}
	} catch (error) {
		if (!silent) log("推送失败");
	}
	$('.progress').hide();
};

// 打开/关闭进度条
let showProgress = (show, progress = 0, message = '') => {
	let progressContainer = $('.progress');
	let progressBar = $('.progress-bar');
	
	if (show) {
		progressContainer.show();
		progressBar.css('width', progress + '%');
		progressBar.attr('aria-valuenow', progress);
	} else {
		progressContainer.hide();
		progressBar.css('width', '0%');
		progressBar.attr('aria-valuenow', 0);
	}
};

// 检查浏览器 WebUSB 支持
function checkWebUSBSupport() {
	const usbWarning = document.getElementById('usb-warning');
	const connectBtn = document.getElementById('connect-btn');
	
	if (navigator.usb) {
		// 浏览器支持 WebUSB
		if (usbWarning) usbWarning.style.display = 'none';
		if (connectBtn) connectBtn.disabled = false;
		updateDeviceLog("浏览器支持 WebUSB");
	} else {
		// 浏览器不支持 WebUSB
		if (usbWarning) {
			usbWarning.style.display = 'block';
			usbWarning.style.color = '#dc3545';
		}
		if (connectBtn) connectBtn.disabled = true;
		updateDeviceLog("浏览器不支持 WebUSB，请使用 Edge 浏览器");
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

// 关闭自定义弹窗
function closeModal() {
	document.getElementById('customModal').style.display = 'none';
}

// 页面加载完成后检查浏览器支持
window.addEventListener('DOMContentLoaded', function() {
	checkWebUSBSupport();
});
