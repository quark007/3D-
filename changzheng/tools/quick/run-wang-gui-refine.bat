@echo off
chcp 65001 >nul
setlocal
rem 王贵精修：双击运行。需要 Blender 3.6 及以上。读取仓库里的 wang-gui-web.glb，输出到本文件夹下的 out\（已在 .gitignore 里忽略），不会覆盖原文件。
set "HERE=%~dp0"
set "BLENDER="
rem 如果自动查找失败，把下一行改成你的 blender.exe 完整路径，例如：set "BLENDER=D:\Blender 4.2\blender.exe"
rem set "BLENDER="
if not defined BLENDER where blender >nul 2>nul && set "BLENDER=blender"
if not defined BLENDER for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set "BLENDER=%%D\blender.exe"
if not defined BLENDER for /d %%D in ("%ProgramFiles(x86)%\Steam\steamapps\common\Blender") do if exist "%%D\blender.exe" set "BLENDER=%%D\blender.exe"
if not defined BLENDER (
  echo 没找到 blender.exe，请用记事本打开本文件，按第 7 行的说明填写路径。
  pause
  exit /b 1
)
echo 使用 Blender：%BLENDER%
"%BLENDER%" -b --factory-startup -P "%HERE%wang-gui-refine.py" -- --in "%HERE%..\..\changzheng\assets\characters\wang-gui\wang-gui-web.glb" --out-dir "%HERE%out" %*
echo.
echo 完成后请把 out\wang-gui-refine-report.json 和 out\wang-gui-refine-check\ 里的图片发给 Quick。
pause
