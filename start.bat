@echo off
chcp 65001 >nul
echo.
echo  正在启动效率工具后端服务...
echo.

cd /d "%~dp0server"

if not exist node_modules (
    echo  首次运行，正在安装依赖...
    npm install
    echo.
)

node index.js
pause