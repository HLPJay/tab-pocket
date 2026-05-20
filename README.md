# Tab Pocket

Tab Pocket 是一个轻量、本地运行的浏览器扩展，用来临时收纳网页、回头查看、并做减法式关闭标签页。

它是一个主动收纳工具，不是自动浏览器会话恢复工具。

## 项目定位

Tab Pocket 面向的是“我现在先收起来，之后再处理”的工作流。

它帮助用户把暂时不想处理的网页收进收纳栏或 Session，减少当前窗口里打开的标签页数量，但又保留后续找回、重新打开和回顾的能力。

## 当前能力

- 当前打开标签页查看
- 当前打开列表自动同步浏览器 tab 创建 / 关闭 / 切换 / 更新
- 单个网页收纳
- 收纳并关闭
- 关闭当前页
- 取消收纳
- 收纳栏
- 收纳网页打开
- 收纳网页删除到回收站
- 收纳网页备注编辑
- 标签与回顾状态编辑
- 当前窗口批量收纳为 Session
- 当前窗口批量收纳并关闭
- Session 展开 / 收起
- Session 单个网页打开
- Session 打开全部
- Session 删除
- Session 内网页备注编辑
- 回收站恢复
- 回收站永久删除
- 回收站清空
- 顶部 SectionNav 分组导航

## 不解决什么

Tab Pocket 不负责以下事情：

- 自动恢复未收纳但已关闭的浏览器窗口
- 跨浏览器同步
- 账号系统
- 云同步
- AI 分析
- 读取网页正文
- 截图
- content script 注入

如果用户关闭浏览器前已经收纳，则可以通过收纳栏或 Sessions 恢复。
如果用户没有收纳就直接关闭浏览器，当前版本不保证恢复。

## 使用方式

普通使用流程：

1. 打开 Chrome / Edge。
2. 点击 Tab Pocket 扩展图标。
3. 在侧边栏中查看当前打开。
4. 对需要后续回看的网页点击收纳。
5. 对可以立即关闭的网页点击收纳并关闭。
6. 使用收纳栏 / Sessions 后续恢复网页。

电脑重启后不需要额外启动服务：

- 不需要启动后端
- 不需要运行 `npx`
- 不需要运行 `npm run dev`
- 打开浏览器后扩展会自动加载
- 已收纳数据保存在浏览器本地扩展存储中

## 开发方式

```bash
npm install
npm run dev
npm run build
npm run test
```

- `npm run dev` 用于开发调试。
- `npm run build` 输出 `.output/chrome-mv3`。
- `npm run test` 执行 Vitest 单元测试。

## 构建与加载扩展

先构建：

```bash
npm run build
```

然后在 Chrome / Edge 中加载：

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”
4. 选择 `.output/chrome-mv3`

## 数据与隐私边界

- 数据保存在 `chrome.storage.local`
- 不上传服务器
- 不使用账号
- 不使用云同步
- 不读取网页正文
- 不保存截图
- 不保存 favicon base64
- 不注入 content script

不同环境的数据边界：

- Chrome 和 Edge 数据独立
- 同一浏览器不同 Profile 数据独立
- 同一浏览器同一 Profile 的不同窗口共享收纳数据
- 当前打开只展示当前窗口标签页

## 资源消耗设计

- 无 `setInterval` 轮询
- 无 WebSocket
- 无后台长连接
- 无 content script
- 当前打开只在 side panel 打开期间监听 `chrome.tabs` 事件
- 只在用户操作或浏览器 tab 事件变化时刷新

## 当前技术栈

- WXT
- React
- TypeScript
- Manifest V3
- Chrome Extension APIs
- Vitest

## 测试

P3 合并时结果：

- `npm run test`：21 个测试文件，297 个测试全部通过
- `npm run build`：通过，`wxt build` 成功

## 阶段记录

### P0：基础侧边栏与当前打开读取

- Manifest V3
- sidePanel
- 当前打开列表
- 无写入，无关闭

### P1：单个收纳与收纳栏

- `chrome.storage.local` 持久化
- 单个收纳
- 打开收纳网页
- 软删除

### P2：收纳并关闭

- 保存成功后关闭真实 tab
- pinned tab 保护
- 关闭失败不回滚已保存数据

### P3：窗口 Session 与产品化收口

- 当前窗口批量收纳
- Session 展开 / 删除 / 打开全部
- 收纳栏
- 回收站
- 标签 / 状态 / 备注
- 当前打开自动同步
- 顶部导航与紧凑 UI

## 后续规划

- 最近窗口快照
- 搜索
- 导出 / 导入 JSON
- 快捷键
- Session 重命名
- Session 归档
- 批量清理
- 单个收纳前选择标签 / 状态
- 跨浏览器同步
