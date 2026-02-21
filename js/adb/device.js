// ADB 设备类
// 参考 Tango ADB 的设备管理设计

class AdbDevice {
    /**
     * 创建 ADB 设备
     * @param {AdbTransport} transport - 传输对象
     */
    constructor(transport) {
        this.transport = transport;
        this.maxPayload = 4096;
        this.banner = '';
        this.mode = '';
        this.connected = false;
        // 存储 ADB 签名密钥
        this.signatureKey = this.generateSignatureKey();
    }

    /**
     * 生成签名密钥
     * @returns {string} Base64 编码的签名密钥
     */
    generateSignatureKey() {
        // 生成一个固定的签名密钥
        const keyData = new Uint8Array([
            0x55, 0x4a, 0x4e, 0x1b, 0xa6, 0x2d, 0x6a, 0x47,
            0x7e, 0x8a, 0xf3, 0x12, 0xc4, 0x5e, 0x9b, 0x80,
            0x3f, 0x1c, 0x7a, 0x6b, 0x2d, 0x5e, 0x8f, 0x4c,
            0x9a, 0x2d, 0x6f, 0x3b, 0x7c, 0x8e, 0x1d, 0x4a,
            0x5c, 0x8f, 0x2e, 0x7b, 0x9d, 0x4f, 0x2c, 0x8e,
            0x1a, 0x6d, 0x3f, 0x9b, 0x7c, 0x2e, 0x5d, 0x8a,
            0x4f, 0x1c, 0x7b, 0x9e, 0x2d, 0x5f, 0x8c, 0x3e,
            0x7a, 0x1d, 0x4f, 0x8b, 0x2e, 0x5d, 0x9c, 0x7f
        ]);
        return btoa(String.fromCharCode.apply(null, keyData));
    }

    /**
     * 计算 ADB 签名
     * @param {Uint8Array} data - 要签名的数据
     * @returns {Uint8Array} 签名结果
     */
    calculateSignature(data) {
        const keyBytes = Uint8Array.from(atob(this.signatureKey), c => c.charCodeAt(0));
        const signature = new Uint8Array(24);
        
        // 简单的签名算法（生产环境应使用更安全的算法）
        for (let i = 0; i < 24; i++) {
            signature[i] = data[i % data.length] ^ keyBytes[i];
        }
        
        return signature;
    }

    /**
     * 处理令牌认证
     * @param {Uint8Array} token - 设备发送的令牌
     * @returns {Promise<Uint8Array>} 签名后的令牌
     */
    async handleTokenAuth(token) {
        try {
            console.log('[ADB] 处理令牌认证，令牌长度:', token.length);
            
            // 使用签名密钥对令牌进行签名
            const signature = this.calculateSignature(token);
            
            // 构建签名数据：签名 + 公钥标识
            const signaturePayload = new Uint8Array(signature.length + this.signatureKey.length);
            signaturePayload.set(signature);
            signaturePayload.set(
                Uint8Array.from(atob(this.signatureKey), c => c.charCodeAt(0)),
                signature.length
            );
            
            // 发送 AUTH(SIGNATURE) 消息
            const authMessage = new AdbMessage('AUTH', 2, 0x10000000, signaturePayload);
            await authMessage.send(this.transport);
            
            console.log('[ADB] 令牌认证响应已发送');
            return signaturePayload;
            
        } catch (error) {
            console.error('[ADB] 令牌认证失败:', error);
            throw new Error('令牌认证失败: ' + error.message);
        }
    }

    /**
     * 处理 RSA 公钥认证
     * @param {Uint8Array} data - 设备发送的数据
     * @returns {Promise<void>}
     */
    async handlePublicKeyAuth(data) {
        try {
            console.log('[ADB] 处理 RSA 公钥认证');
            
            // 构建公钥字符串
            const publicKey = 'AdbKey\x00' + this.signatureKey;
            const publicKeyBytes = new TextEncoder().encode(publicKey);
            
            // 发送 AUTH(RSAPUBLICKEY) 消息
            const authMessage = new AdbMessage('AUTH', 3, 0x10000000, publicKeyBytes);
            await authMessage.send(this.transport);
            
            console.log('[ADB] RSA 公钥认证响应已发送');
            
        } catch (error) {
            console.error('[ADB] RSA 公钥认证失败:', error);
            throw new Error('RSA 公钥认证失败: ' + error.message);
        }
    }

    /**
     * 连接到设备
     * @param {string} banner - 连接横幅
     * @param {Function} authCallback - 认证回调
     * @returns {Promise<AdbDevice>}
     */
    async connect(banner = 'host::web', authCallback = null) {
        try {
            // 发送连接消息
            const message = new AdbMessage('CNXN', 0x01000000, this.maxPayload, banner);
            await message.send(this.transport);

            // 处理响应
            let response = await AdbMessage.receive(this.transport);

            // 处理认证
            while (response.cmd === 'AUTH') {
                console.log('[ADB] 收到认证请求，类型:', response.arg0);
                
                if (authCallback) {
                    authCallback(response.arg0, response.data);
                }
                
                // 认证类型：
                // 1 = TOKEN 令牌认证
                // 2 = SIGNATURE 签名认证  
                // 3 = RSAPUBLICKEY RSA 公钥认证
                if (response.arg0 === 1) {
                    // TOKEN 令牌认证
                    console.log('[ADB] TOKEN 认证');
                    await this.handleTokenAuth(response.data);
                } else if (response.arg0 === 2) {
                    // SIGNATURE 签名认证
                    console.log('[ADB] SIGNATURE 认证');
                    await this.handleTokenAuth(response.data);
                } else if (response.arg0 === 3) {
                    // RSAPUBLICKEY RSA 公钥认证
                    console.log('[ADB] RSA 公钥认证');
                    await this.handlePublicKeyAuth(response.data);
                } else {
                    throw new Error('未知认证类型: ' + response.arg0);
                }
                
                // 接收下一个响应
                response = await AdbMessage.receive(this.transport);
            }

            if (response.cmd !== 'CNXN') {
                throw new Error('连接失败: ' + response.cmd);
            }

            // 解析响应
            this.maxPayload = response.arg1;
            if (response.data) {
                const decoder = new TextDecoder('utf-8');
                this.banner = decoder.decode(response.data);
                const parts = this.banner.split(':');
                this.mode = parts[0];
            }

            this.connected = true;
            console.log('[ADB] 设备连接成功:', this.banner);
            return this;

        } catch (error) {
            console.error('[ADB] 连接错误:', error);
            throw error;
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        try {
            if (this.connected) {
                await this.transport.close();
                this.connected = false;
                console.log('ADB device disconnected');
            }
        } catch (error) {
            console.error('Error disconnecting from ADB device:', error);
        }
    }

    /**
     * 打开服务流
     * @param {string} service - 服务名称
     * @returns {Promise<AdbStream>}
     */
    async open(service) {
        return AdbStream.open(this, service);
    }

    /**
     * 执行 shell 命令
     * @param {string} command - 命令
     * @returns {Promise<AdbStream>}
     */
    async shell(command) {
        return this.open('shell:' + command);
    }

    /**
     * 开启 TCP/IP
     * @param {number} port - 端口
     * @returns {Promise<AdbStream>}
     */
    async tcpip(port) {
        return this.open('tcpip:' + port);
    }

    /**
     * 同步操作
     * @returns {Promise<AdbStream>}
     */
    async sync() {
        return this.open('sync:');
    }

    /**
     * 重启设备
     * @param {string} command - 重启命令
     * @returns {Promise<AdbStream>}
     */
    async reboot(command = '') {
        return this.open('reboot:' + command);
    }

    /**
     * 安装应用
     * @param {string} apkPath - APK 文件路径
     * @param {boolean} reinstall - 是否重新安装
     * @param {boolean} grantPermissions - 是否自动授予权限
     * @returns {Promise<AdbStream>}
     */
    async install(apkPath, reinstall = false, grantPermissions = false) {
        let command = 'install';
        if (reinstall) {
            command += ' -r';
        }
        if (grantPermissions) {
            command += ' -g';
        }
        return this.shell(`${command} ${apkPath}`);
    }

    /**
     * 卸载应用
     * @param {string} packageName - 包名
     * @param {boolean} keepData - 是否保留数据
     * @returns {Promise<AdbStream>}
     */
    async uninstall(packageName, keepData = false) {
        let command = 'uninstall';
        if (keepData) {
            command += ' -k';
        }
        return this.shell(`${command} ${packageName}`);
    }

    /**
     * 启动 Activity
     * @param {string} component - 组件名 (包名/类名)
     * @param {string} action - 动作
     * @param {string} data - 数据 URI
     * @returns {Promise<AdbStream>}
     */
    async startActivity(component, action = '', data = '') {
        let command = 'am start';
        if (action) {
            command += ` -a ${action}`;
        }
        if (data) {
            command += ` -d ${data}`;
        }
        command += ` ${component}`;
        return this.shell(command);
    }

    /**
     * 停止应用
     * @param {string} packageName - 包名
     * @returns {Promise<AdbStream>}
     */
    async forceStop(packageName) {
        return this.shell(`am force-stop ${packageName}`);
    }

    /**
     * 列出已安装的应用
     * @param {boolean} system - 是否包含系统应用
     * @returns {Promise<AdbStream>}
     */
    async listPackages(system = false) {
        let command = 'pm list packages';
        if (!system) {
            command += ' -3';
        }
        return this.shell(command);
    }

    /**
     * 推送文件
     * @param {string} remotePath - 远程路径
     * @param {ArrayBuffer} data - 文件数据
     * @param {number} mode - 文件模式
     * @returns {Promise}
     */
    async push(remotePath, data, mode = 0o644) {
        const sync = await this.sync();
        try {
            // 实现推送逻辑
            // 这里需要实现完整的 sync 协议
            throw new Error('Push not implemented yet');
        } finally {
            await sync.close();
        }
    }

    /**
     * 拉取文件
     * @param {string} remotePath - 远程路径
     * @returns {Promise<ArrayBuffer>}
     */
    async pull(remotePath) {
        const sync = await this.sync();
        try {
            // 实现拉取逻辑
            // 这里需要实现完整的 sync 协议
            throw new Error('Pull not implemented yet');
        } finally {
            await sync.close();
        }
    }
}

// ADB 流类
class AdbStream {
    /**
     * 创建 ADB 流
     * @param {AdbDevice} device - 设备
     * @param {number} localId - 本地 ID
     * @param {number} remoteId - 远程 ID
     */
    constructor(device, localId, remoteId) {
        this.device = device;
        this.localId = localId;
        this.remoteId = remoteId;
        this.closed = false;
    }

    /**
     * 打开流
     * @param {AdbDevice} device - 设备
     * @param {string} service - 服务名称
     * @returns {Promise<AdbStream>}
     */
    static async open(device, service) {
        const localId = AdbStream.nextId++;
        let remoteId = 0;

        const message = new AdbMessage('OPEN', localId, remoteId, service);
        await message.send(device.transport);

        let response = await AdbMessage.receive(device.transport);
        while (response.arg1 !== localId) {
            response = await AdbMessage.receive(device.transport);
        }

        if (response.cmd !== 'OKAY') {
            throw new Error('Open failed: ' + response.cmd);
        }

        remoteId = response.arg0;
        return new AdbStream(device, localId, remoteId);
    }

    /**
     * 关闭流
     */
    async close() {
        if (!this.closed) {
            this.closed = true;
            const message = new AdbMessage('CLSE', this.localId, this.remoteId);
            await message.send(this.device.transport);
        }
    }

    /**
     * 发送数据
     * @param {ArrayBuffer|string} data - 数据
     */
    async send(data) {
        if (this.closed) {
            throw new Error('Stream closed');
        }

        const message = new AdbMessage('WRTE', this.localId, this.remoteId, data);
        await message.send(this.device.transport);

        // 等待确认
        let response = await AdbMessage.receive(this.device.transport);
        while (response.arg0 !== this.remoteId || response.arg1 !== this.localId) {
            response = await AdbMessage.receive(this.device.transport);
        }

        if (response.cmd !== 'OKAY') {
            throw new Error('Send failed: ' + response.cmd);
        }
    }

    /**
     * 接收数据
     * @returns {Promise<ArrayBuffer>}
     */
    async receive() {
        if (this.closed) {
            throw new Error('Stream closed');
        }

        let response = await AdbMessage.receive(this.device.transport);
        while (response.arg0 !== this.remoteId || response.arg1 !== this.localId) {
            response = await AdbMessage.receive(this.device.transport);
        }

        if (response.cmd === 'CLSE') {
            this.closed = true;
            return null;
        }

        if (response.cmd !== 'WRTE') {
            throw new Error('Receive failed: ' + response.cmd);
        }

        // 发送确认
        const message = new AdbMessage('OKAY', this.localId, this.remoteId);
        await message.send(this.device.transport);

        return response.data;
    }
}

// 流 ID 计数器
AdbStream.nextId = 1;

// 导出类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AdbDevice,
            AdbStream
        };
    }
} catch (e) {
    // 浏览器环境
    window.AdbDevice = AdbDevice;
    window.AdbStream = AdbStream;
}
