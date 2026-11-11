# 云服务器部署

本项目是纯前端静态应用，可以将 dist 的内容直接部署到现有云服务器的 Nginx。服务器无需运行 Node.js，也无需启动后端或数据库。

以下以 Linux + 已安装的 Nginx 为例；如果使用宝塔、1Panel 或现有网关，也可以直接创建静态网站并设置相同的站点根目录。

## 1. 本地构建

在 Windows PowerShell 中执行：

```powershell
cd E:\Bookkeeping
npm run build
```

上传 dist 内部的全部文件，包括 assets、icons、index.html、sw.js、workbox-*.js 和 manifest.webmanifest。不要上传 node_modules，也不要在服务器上运行 npm run dev 或 npm run preview 作为正式服务。

## 2. 设置站点目录并上传

例如在服务器上为此项目单独创建目录：

```sh
sudo mkdir -p /var/www/bookkeeping
```

使用 WinSCP、SFTP 或服务器面板将 dist 的内容放到该目录。若使用提供的 bookkeeping-web.zip，解压后的 index.html 必须直接位于站点根目录：

```text
/var/www/bookkeeping/index.html
/var/www/bookkeeping/assets/...
/var/www/bookkeeping/icons/...
/var/www/bookkeeping/sw.js
/var/www/bookkeeping/manifest.webmanifest
```

确保 Nginx 运行用户能够读取文件和进入目录；不要为方便而设置全目录 777。复用服务器时，创建独立站点目录，不要覆盖其他应用的文件。

## 3. 配置域名和 Nginx

建议使用专用子域名，例如 bookkeeping.你的域名，解析到服务器公网 IP。当前 Vite、PWA 图标、start_url、scope 和离线回退均使用根路径，因此直接部署在域名根目录最省事。

如果必须使用已有域名的 /bookkeeping/ 子路径，需要同步调整 Vite base、PWA 路径、图标路径、HTML 引用和 Nginx 路径，不能只把当前构建复制进子目录。

复制本目录 nginx.bookkeeping.conf 中的 server 块到现有 Nginx 的站点配置目录。该文件不是完整 nginx.conf，不要替换原来的全局配置。按服务器实际情况选择 conf.d、sites-enabled 或管理面板的站点配置入口。

需要修改：

- server_name：改成实际域名。仅用于 IP 测试时也可填写服务器公网 IP。
- root：改成实际存放 index.html 的目录。
- 父级 http 配置应保留 Nginx 标准 mime.types，以正确发送 JS 和 CSS 类型。

HTTP 配置可用于第一次检查访问。启用后在服务器执行：

```sh
sudo nginx -t
sudo nginx -s reload
```

这些命令需要在服务器上执行。具体配置路径取决于服务器已有安装，先确认新文件已被主配置 include。

## 4. 配置 HTTPS

使用现有服务器面板、证书或反向代理，为这个站点启用 HTTPS。最终入口固定使用 HTTPS 域名，HTTP 可重定向到 HTTPS。

公网普通 HTTP 地址可用于基础网页访问，但 Service Worker 需要安全上下文；离线缓存和依赖它的 PWA 能力不能按 HTTPS 环境使用。先确定正式域名并配置证书，再迁入正式账目。

若启用 HTTPS 时增加了新的 server 块，保留示例中 root、缓存和 location 规则。确保云服务器安全组、防火墙允许站点实际使用的 80/443 端口；如果由现有代理接入，则按已有入口配置。

## 5. 验收

在正式 HTTPS 地址检查：

1. 首页、商品和记录页面可以正常显示。
2. 新增一件商品、记录一次销售，刷新后数据仍在。
3. JSON 备份可以下载，备份导入先展示正确覆盖范围。
4. /sw.js 返回 JavaScript，/manifest.webmanifest 返回清单，JS/CSS 请求不返回 HTML。
5. 不存在的 /assets/missing.js 返回 404。
6. 浏览器完成首次资源缓存后，断网重新打开并检查记账功能；安装入口按浏览器支持情况显示。

当前环境已验证前端构建；Nginx 配置是待适配的模板，须在实际服务器上通过 nginx -t 并完成上述检查。

## 6. 更新

修改代码后重新 npm run build，并上传到同一个站点。先上传新资源，再更新 index.html 和 sw.js 等入口文件；保留上一版本带哈希的资源一段时间，避免已打开页面或旧缓存请求旧资源时出现 404。不要用服务器目录中的文件作为账目备份。

## 数据说明

云服务器负责提供程序文件，商品和销售依然保存在用户设备的浏览器 IndexedDB 中。当前版本不会将账目写入云服务器，也不会自动跨设备同步。

从 localhost、其他域名或其他协议迁移时，在旧入口导出 JSON，在正式 HTTPS 入口导入。以后保持域名和协议稳定，定期将备份另存到其他位置。

## 官方参考

- Nginx 静态文件与配置：https://nginx.org/en/docs/beginners_guide.html
- Nginx try_files：https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Service Worker 安全上下文：https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
