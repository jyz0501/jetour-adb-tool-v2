// ADB 传输层抽象
// 参考 Tango ADB 的架构设计

class AdbTransport {
    /**
     * 打开传输连接
     */
    async open() {
        throw new Error('open() must be implemented');
    }

    /**
     * 关闭传输连接
     */
    async close() {
        throw new Error('close() must be implemented');
    }

    /**
     * 发送数据
     * @param {ArrayBuffer} data - 要发送的数据
     */
    async send(data) {
        throw new Error('send() must be implemented');
    }

    /**
     * 接收数据
     * @param {number} length - 要接收的数据长度
     * @returns {ArrayBuffer} 接收到的数据
     */
    async receive(length) {
        throw new Error('receive() must be implemented');
    }

    /**
     * 重置传输
     */
    async reset() {
        throw new Error('reset() must be implemented');
    }
}

// WebUSB 传输实现
class WebUsbTransport extends AdbTransport {
    constructor(device) {
        super();
        this.device = device;
        this.epIn = null;
        this.epOut = null;
    }

    /**
     * 静态方法：请求 WebUSB 设备
     */
    static async requestDevice() {
        const filters = [
            { classCode: 255, subclassCode: 66, protocolCode: 1 }, // ADB
            { classCode: 255, subclassCode: 66, protocolCode: 3 }  // Fastboot
        ];

        try {
            const device = await navigator.usb.requestDevice({ filters });
            return new WebUsbTransport(device);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No device selected');
            }
            throw error;
        }
    }

    async open() {
        if (!this.device) {
            throw new Error('No device');
        }

        try {
            // 打开设备
            await this.device.open();
            
            // 选择配置
            if (this.device.configuration === null) {
                await this.device.selectConfiguration(1);
            }

            // 找到 ADB 接口
            const match = this._findAdbInterface();
            if (!match) {
                throw new Error('ADB interface not found');
            }

            // 声明接口
            await this.device.claimInterface(match.interfaceNumber);

            // 选择备用接口
            await this.device.selectAlternateInterface(match.interfaceNumber, match.alternateSetting);

            // 获取端点
            this.epIn = this._getEndpoint(match.endpoints, 'in');
            this.epOut = this._getEndpoint(match.endpoints, 'out');

            if (!this.epIn || !this.epOut) {
                throw new Error('ADB endpoints not found');
            }

            console.log('WebUSB transport opened successfully');
        } catch (error) {
            console.error('Error opening WebUSB transport:', error);
            throw error;
        }
    }

    async close() {
        if (this.device) {
            try {
                await this.device.close();
                console.log('WebUSB transport closed');
            } catch (error) {
                console.error('Error closing WebUSB transport:', error);
            }
        }
    }

    async send(data) {
        if (!this.epOut) {
            throw new Error('Transport not initialized');
        }

        try {
            await this.device.transferOut(this.epOut, data);
        } catch (error) {
            console.error('Error sending data:', error);
            throw error;
        }
    }

    async receive(length) {
        if (!this.epIn) {
            throw new Error('Transport not initialized');
        }

        try {
            const result = await this.device.transferIn(this.epIn, length);
            return result.data.buffer;
        } catch (error) {
            console.error('Error receiving data:', error);
            throw error;
        }
    }

    async reset() {
        if (this.device) {
            try {
                await this.device.reset();
                console.log('Device reset');
            } catch (error) {
                console.error('Error resetting device:', error);
            }
        }
    }

    // 私有方法：查找 ADB 接口
    _findAdbInterface() {
        for (const configuration of this.device.configurations) {
            for (const iface of configuration.interfaces) {
                for (const alternate of iface.alternates) {
                    if (alternate.interfaceClass === 255 &&
                        alternate.interfaceSubclass === 66 &&
                        alternate.interfaceProtocol === 1) {
                        return {
                            interfaceNumber: iface.interfaceNumber,
                            alternateSetting: alternate.alternateSetting,
                            endpoints: alternate.endpoints
                        };
                    }
                }
            }
        }
        return null;
    }

    // 私有方法：获取端点
    _getEndpoint(endpoints, direction) {
        for (const endpoint of endpoints) {
            if (endpoint.direction === direction) {
                return endpoint.endpointNumber;
            }
        }
        return null;
    }
}

// 导出传输类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AdbTransport,
            WebUsbTransport
        };
    }
} catch (e) {
    // 浏览器环境
    window.AdbTransport = AdbTransport;
    window.WebUsbTransport = WebUsbTransport;
}
