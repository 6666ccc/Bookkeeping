# 小账本

面向日常商品买卖的本地记账 PWA。采用 React、TypeScript、Vite 和 Dexie（IndexedDB），数据保存在当前浏览器中。

## 使用流程

1. 在「商品」录入商品完整名称（含规格）、单件进价和单件售价。
2. 在「售出」搜索并选择商品，填写数量，按需调整本次价格，再保存销售。
3. 在「记录」查看按天汇总、本月利润和累计利润，导出备份或销售表格。

商品名称去除首尾空格后不可重复；遇到同名商品会提示编辑已有商品。商品可编辑或直接删除，历史销售始终保留成交时的名称、价格和数量。每次保存一种商品，保存后清空商品和临时价格，数量恢复为 1；选择列表优先显示最近售出的商品。

本项目不管理库存。利润按（售价 − 进价）× 数量计算，未计入其他经营费用。金额以整数分保存。

## 开发与检查

建议使用 Node.js 24 LTS。测试通过 Node.js 内置 TypeScript 支持直接加载数据层。

```sh
npm install
npm run dev -- --host 0.0.0.0
npm test
npm run lint
npm run build
npm run preview
```

开发服务默认端口为 5173，占用时 Vite 会选择下一个可用端口。生产构建位于 dist，并生成 PWA 清单和离线资源缓存。安装和离线能力需要浏览器支持及安全上下文。

## 云服务器部署

直接将 dist 的内容部署到现有 Nginx 静态站点，无需增加后端。部署步骤、HTTPS 与更新说明见 [deploy/README.md](deploy/README.md)，可参考 [Nginx 配置模板](deploy/nginx.bookkeeping.conf)。建议使用独立域名或子域名的根目录。

## 数据与兼容性

- 数据库版本 2 新增独立商品表，保留版本 1 的全部销售，不从旧账自动生成商品。
- 每笔销售保存商品标识及成交快照；商品改价、改名、删除和同名重建不改变旧账。
- JSON 备份版本 2 同时包含商品和销售，确认后以事务整体覆盖。
- 旧版 JSON 及销售数组备份继续兼容，导入时只替换销售，保留当前商品库。
- 空备份和仅含商品的备份也可以恢复，覆盖范围会在导入前明确提示。
- CSV 导出销售明细，可使用 Excel 或 WPS 查看。
- 本地数据按浏览器和站点来源隔离，清理浏览器数据会丢失。请定期导出备份。

## 主要代码

- src/db.ts：商品、销售、数据库升级、备份校验及恢复。
- src/components/ProductsView.tsx：商品录入、编辑、搜索和删除。
- src/components/EntryForm.tsx：商品销售、临时价格及利润预览。
- src/components/ProductPicker.tsx：商品搜索选择。
- src/components/TodayView.tsx、HistoryView.tsx：今日与历史统计。
- src/backup.ts、components/DataTools.tsx：备份和导出。
- tests/catalog.test.mjs：隔离的 IndexedDB 测试，覆盖升级、快照、名称唯一性及恢复回滚。
