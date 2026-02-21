// adb 和 webusb 变量在 utils.js 中声明

let init = async () => {
	if(!navigator.usb) {
		openLogWindow();
		log("您的浏览器不支持 webadb 功能, 请到手机应用商店安装 Edge 浏览器后打开该页面");
		return;
	}
	
	clear();
	try {
		webusb = await Adb.open("WebUSB");
	} catch(error) {
		if (error.message) {
			if(error.message.indexOf('No device') != -1) { // 未选中设备
				return;
			}else if(error.message.indexOf('was disconnected') != -1) {
				openLogWindow();
				log('无法连接到此设备, 请尝试重新连接');
			}
		}
		
		openLogWindow();
		log(error);
	}
};

// 自动连接设备函数
let autoConnect = async () => {
    if (adb) {
        return true; // 已经连接，直接返回成功
    }
    
    await init();
    if(!webusb) {
        log("未检测到设备，请连接设备后重试");
        return false;
    }
    
    if (webusb.isAdb()) {
        // 连接前等待设备稳定
        log('检测到设备，等待设备初始化...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // 等待1.5秒让设备稳定
        
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
                    log(`连接失败，${attempt < 3 ? '正在重试...' : '已达到最大重试次数'}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 每次重试前等待1秒
                } else {
                    log('连接失败，请检查并断开其他ADB软件连接');
                    return false;
                }
            }
        }
    }
    return false;
};

let connect = async () => {
    await autoConnect();
};

let disconnect = async () => {
	if(!webusb){
		return;
	}
	webusb.close();
};

let clear = async () => {
	$('#log').text("");
	$("#log-content").text("");
	$('#progress .progress-bar').css('width', '0%');
};

let exec_command = async (args) => {
	exec_shell($('#shell').val());
}

let setDeviceName = async (name) => {
	// 移除了设备名称显示功能
}

let exec_shell = async (command, silent = false) => {
	if (!adb) {
		if (!silent) log("未连接到设备");
		return;
	}
	if(!command) {
		return;
	}
	showProgress(true);

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
	showProgress(false);
};

let push = async (filePath, blob, on_progress = null, silent = false, desc = '') => {
	if (!adb) {
		if (!silent) log("未连接到设备");
		return;
	}
	showProgress(true, 0, '准备推送文件...');

	if (!silent) log("正在推送文件");

	try {
		sync = await adb.sync();
		await sync.push(blob, filePath, 0o644, (count, total) => {
			let progress = Math.round((count / total) * 100);
			showProgress(true, progress, `正在推送: ${progress}%`);
			if(on_progress) on_progress(count, total);
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
		showProgress(true, 100, '推送完成');
		setTimeout(() => {
			showProgress(false);
		}, 500);
	} catch(error) {
		showProgress(false);
		if (!silent) log("推送失败");
	}
}

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

let showProgress = async (show, progress = 0, message = '') => {
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

let wifiAdb = async (enable) => {
	// wifiAdb 函数已移至 system.js
};

let loadFile = async () => {
	$('#file').click();
	$('#fileName').blur();
}

let loadApkFile = async () => {
	$('#apkFile').click();
	$('#apkFileName').blur();
}

let openLogWindow = () => {
	$('#log-overlay').fadeIn(300);
	$('#log-window').show().css('display', 'flex');
	// Add animation class
	$('#log-window').addClass('popup-active');
};

let closeLogWindow = (isManual = false) => {
	$('#log-window').removeClass('popup-active');
	$('#log-overlay').fadeOut(300);
	$('#log-window').fadeOut(300);
	
	// 只有在手动关闭时才刷新页面
	if (isManual) {
		location.reload();
	}
};

$(document).ready(function() {
	if (navigator.usb) {
		$('#nowebusb').hide();
	}
	
	// $('#file') 这家伙是数组...
	let file = $('#file')[0];
	if(file) {
		file.addEventListener('change', function() {
			let fileName = $('#fileName');
	
			let files = file.files;
			if(files.length > 0){
				fileName.text(files[0].name);
			}else{
				fileName.text("未选择文件");
			}
		});
	}
	
	let apkFile = $('#apkFile')[0];
	if(apkFile) {
		apkFile.addEventListener('change', function() {
			let fileName = $('#apkFileName');
	
			let files = apkFile.files;
			if(files.length > 0){
				fileName.text(files[0].name);
			}else{
				fileName.text("未选择文件");
			}
		});
	}
	
	setDeviceName(null); // 设置默认设备名.
	
	// Close popup when clicking overlay
	$('#log-overlay').click((e) => {
		if (e.target === e.currentTarget) {
			closeLogWindow(true); // 点击遮罩层关闭时刷新页面
		}
	});
	
	// Close popup with ESC key
	$(document).keydown((e) => {
		if (e.key === 'Escape') {
			closeLogWindow(true); // 按ESC键关闭时刷新页面
		}
	});
	
	// Initialize progress bar
	$('.progress').hide();
});

// 一键安装专用版和通用版
let installBothVersions = async () => {
    openLogWindow();
    clear();
    
    // 确保连接状态干净
    if (adb) {
        try {
            adb.close();
        } catch (e) {
            // 忽略断开连接时的错误
        }
        adb = null;
    }
    
    if (!await autoConnect()) {
        return;
    }
    try {
        let shellSetProp = "setprop persist.sv.enable_adb_install 1";
        let shellDisableAdbInstall = "setprop persist.sv.enable_adb_install 0";
        // 先安装专用版
        let specialFilePath = "/data/local/tmp/aqfcj.apk";
        let shellInstallSpecial = "pm install -g -r " + specialFilePath;
        showProgress(true, 0, '正在下载专用版...');
        log("正在下载专用版...");
        let specialResponse = await fetch('/apk/aqfcj.apk');
        if (!specialResponse.ok) throw new Error('专用版下载失败');
        let specialFileBlob = await specialResponse.blob();
        let specialFile = new File([specialFileBlob], "aqfcj.apk", { type: "application/vnd.android.package-archive" });
        showProgress(true, 30, '正在推送专用版...');
        await push(specialFilePath, specialFile, null, false, '专用版');
        showProgress(true, 60, '正在设置系统属性...');
        await exec_shell(shellSetProp, true);
        showProgress(true, 80, '正在尝试安装专用版...');
        let specialInstallResult = '';
        let shell = await adb.shell(shellInstallSpecial);
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            specialInstallResult += decoder.decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        await exec_shell(shellDisableAdbInstall, true);
        if (specialInstallResult.includes('Success') || specialInstallResult.includes('success')) {
            log("专用版安装成功，正在启动清风车机助手...");
            await exec_shell('monkey -p qfapp.cccyn.cn -c android.intent.category.LAUNCHER 1', true);
            log("专用版安装成功，正在启用ADB连接...");
            $('#tcpip').val(5555);
            await wifiAdb(true);
            showProgress(true, 100, '安装完成');
            setTimeout(() => {
                showProgress(false);
                log("已成功安装专用版并启用ADB连接！");
            }, 500);
            return;
        }
        // 专用版安装失败，尝试安装通用版
        log("专用版安装失败，尝试安装通用版...");
        let generalFilePath = "/data/local/tmp/qfcj.apk";
        let shellInstallGeneral = "pm install -g -r " + generalFilePath;
        showProgress(true, 0, '正在下载通用版...');
        log("正在下载通用版...");
        let generalResponse = await fetch('/apk/qfcj.apk');
        if (!generalResponse.ok) throw new Error('通用版下载失败');
        let generalFileBlob = await generalResponse.blob();
        let generalFile = new File([generalFileBlob], "qfcj.apk", { type: "application/vnd.android.package-archive" });
        showProgress(true, 30, '正在推送通用版...');
        await push(generalFilePath, generalFile, null, false, '通用版');
        showProgress(true, 60, '正在设置系统属性...');
        await exec_shell(shellSetProp, true);
        showProgress(true, 80, '正在尝试安装通用版...');
        let generalInstallResult = '';
        shell = await adb.shell(shellInstallGeneral);
        r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            generalInstallResult += decoder.decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        await exec_shell(shellDisableAdbInstall, true);
        if (generalInstallResult.includes('Success') || generalInstallResult.includes('success')) {
            log("通用版安装成功，正在授权...");
            // 授权指令
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.WRITE_SECURE_SETTINGS', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn WRITE_SETTINGS allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn REQUEST_INSTALL_PACKAGES allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn GET_USAGE_STATS allow', true);
            await exec_shell('cmd appops set qfapp.cccyn.cn SYSTEM_ALERT_WINDOW allow', true);
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.DUMP', true);
            await exec_shell('pm grant qfapp.cccyn.cn android.permission.READ_LOGS', true);
            log("通用版安装成功，正在启动清风车机助手...");
            await exec_shell('monkey -p qfapp.cccyn.cn -c android.intent.category.LAUNCHER 1', true);
            log("通用版安装成功，正在启用ADB连接...");
            $('#tcpip').val(5555);
            await wifiAdb(true);
            showProgress(true, 100, '安装完成');
            setTimeout(() => {
                showProgress(false);
                log("已成功安装通用版并启用ADB连接！");
            }, 500);
        } else {
            showProgress(false);
            log("通用版安装失败，请检查设备兼容性！");
        }
    } catch (error) {
        showProgress(false);
        log("安装过程中出现错误，请检查线材连接是否稳定或尝试刷新页面后重新安装！");
    }
};

