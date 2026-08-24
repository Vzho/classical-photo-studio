param(
  [string]$OutputDir = "",
  [string]$PackageName = "classical-photo-studio-source"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir "..")).Path

if (-not $OutputDir) {
  $OutputDir = Join-Path $root "release"
}

$outputRoot = if (Test-Path $OutputDir) {
  (Resolve-Path $OutputDir).Path
} else {
  (New-Item -ItemType Directory -Path $OutputDir).FullName
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $outputRoot "$PackageName-$timestamp"
$zipPath = "$targetDir.zip"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "未找到 Git。请先安装 Git，或直接使用 GitHub 仓库地址交付。"
}

New-Item -ItemType Directory -Path $targetDir | Out-Null

$files = & git -C $root ls-files --cached --modified --others --exclude-standard
$excludedPrefixes = @(
  ".agents/",
  ".codex/",
  ".kiro/",
  "docs/superpowers/",
  "release/"
)

foreach ($file in $files) {
  if (-not $file) { continue }
  $normalizedFile = $file.Replace("\", "/")
  if ($excludedPrefixes | Where-Object { $normalizedFile.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase) }) {
    continue
  }

  $sourcePath = Join-Path $root $file
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { continue }

  $destinationPath = Join-Path $targetDir $file
  $destinationDir = Split-Path -Parent $destinationPath

  if (-not (Test-Path $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  }

  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

$privateFiles = @(
  "admin/.env",
  "admin/sync.log",
  "miniprogram/config/client.config.js",
  "miniprogram/client.config.js",
  "miniprogram/project.private.config.json",
  "project.config.json",
  "project.private.config.json"
)

foreach ($file in $privateFiles) {
  $privatePath = Join-Path $targetDir $file
  if (Test-Path -LiteralPath $privatePath) {
    Remove-Item -LiteralPath $privatePath -Force
  }
}

$miniProjectConfigPath = Join-Path $targetDir "miniprogram/project.config.json"
if (Test-Path -LiteralPath $miniProjectConfigPath) {
  $miniProjectConfig = Get-Content -LiteralPath $miniProjectConfigPath -Raw | ConvertFrom-Json
  $miniProjectConfig.appid = "touristappid"
  $miniProjectConfig.projectname = "photo-portfolio-miniprogram"
  $miniProjectConfig.description = "作品合集小程序源码模板"
  $miniProjectConfigJson = $miniProjectConfig | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText(
    $miniProjectConfigPath,
    "$miniProjectConfigJson`n",
    (New-Object System.Text.UTF8Encoding($false))
  )
}

$templateConfig = Join-Path $targetDir "miniprogram/data/portfolio-config.template.json"
$runtimeConfig = Join-Path $targetDir "miniprogram/data/portfolio-config.json"
if (Test-Path -LiteralPath $templateConfig) {
  Copy-Item -LiteralPath $templateConfig -Destination $runtimeConfig -Force

  $runtimeConfigModule = Join-Path $targetDir "miniprogram/data/portfolio-config.js"
  $runtimeConfigJson = (Get-Content -LiteralPath $templateConfig -Raw).TrimEnd([char[]]"`r`n")
  Set-Content -LiteralPath $runtimeConfigModule -Value "// This file is generated from portfolio-config.json for the mini program runtime fallback.`nmodule.exports = $runtimeConfigJson" -Encoding UTF8
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $targetDir "*") -DestinationPath $zipPath -Force

Write-Host "干净源码包已生成:"
Write-Host $zipPath
Write-Host ""
Write-Host "已排除: admin/.env、SecretKey、客户 COS 配置、真实 AppID、上传缓存、内部开发计划、node_modules、release。"
