# ADB 库说明

## 当前状态

项目当前使用自研的 ADB 实现，位于 `js/adb/` 目录：
- `transport.js` - WebUSB 传输层
- `message.js` - ADB 消息协议
- `device.js` - ADB 设备管理
- `index.js` - ADB 主入口

## Ya-WebADB 集成

如果需要切换到 Ya-WebADB 库，请按照以下步骤操作：

### 1. 克隆 Ya-WebADB 项目

```bash
git clone https://github.com/yume-chan/ya-webadb.git
cd ya-webadb
npm install
npm run build
```

### 2. 复制构建产物

将构建后的文件复制到本项目中：
- `dist/ya-webadb.js` → 本项目的 `js/libs/` 目录

### 3. 修改 HTML 引用

在 `index.html` 中替换 ADB 库引用：

```html
<!-- 使用 Ya-WebADB 库 -->
<script src="js/libs/ya-webadb.js"></script>
```

### 4. 重构设备连接代码

将当前的设备连接逻辑改用 Ya-WebADB API：

```javascript
// 当前代码（自研实现）
window.adbDevice = new AdbDevice(window.adbTransport);
await window.adbDevice.connect("host::web");

// 改为 Ya-WebADB
const device = await navigator.usb.requestDevice({ filters });
const adb = new Adb(device);
await adb.connect();
```

## 当前自研实现的优势

- 轻量级，无外部依赖
- 完全可控，易于定制
- 支持 WebUSB 传输
- 支持认证流程（TOKEN/SIGNATURE/RSA）

## 何时切换到 Ya-WebADB

- 需要更完整的 ADB 功能支持
- 需要更好的兼容性
- 需要社区维护的稳定版本
