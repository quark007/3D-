#!/usr/bin/env python3
"""git push 不可用时的备用通道：只走 api.github.com，把工作区差异作为一个提交推到 main。

用法：
  set GITHUB_TOKEN=ghp_xxx                    (Windows CMD)
  $env:GITHUB_TOKEN="ghp_xxx"                 (PowerShell)
  export GITHUB_TOKEN=ghp_xxx                 (bash)

  python tools/github-api-push.py "提交说明"          # 实际推送
  python tools/github-api-push.py --dry-run           # 只看会改哪些文件，不推送

特点：
- 不依赖 github.com 的 git 传输端点（CONNECT 502 时仍可用）
- 只上传内容有差异的文件，不重传整个仓库
- 不改写历史、不 force push；基于远端当前 main 追加一个提交
"""
import os
import sys
import json
import base64
import subprocess
import time
import urllib.request
import urllib.error

TOKEN = os.environ.get('GITHUB_TOKEN', '').strip()
REPO = os.environ.get('GITHUB_REPO', 'quark007/3D-')
BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
API = 'https://api.github.com/repos/' + REPO
DRY = '--dry-run' in sys.argv
MESSAGE = next((a for a in sys.argv[1:] if a != '--dry-run'), None) or 'chore: sync via GitHub API'


def api(method, path, data=None):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(API + path, data=body, method=method, headers={
        'Authorization': 'Bearer ' + TOKEN,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'github-api-push'
    })
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.load(resp)
        except Exception as exc:
            last_error = exc
            if attempt < 4:
                time.sleep(1 + attempt)
    raise last_error


ROOT = os.getcwd()


def git(*args):
    return subprocess.check_output(('git',) + args, cwd=ROOT).decode('utf-8', 'replace').strip()


if not TOKEN:
    sys.exit('缺少 GITHUB_TOKEN 环境变量')

ROOT = git('rev-parse', '--show-toplevel')

head = api('GET', '/git/ref/heads/' + BRANCH)['object']['sha']
base_tree = api('GET', '/git/commits/' + head)['tree']['sha']
tree_data = api('GET', '/git/trees/' + base_tree + '?recursive=1')
remote = {i['path']: i['sha'] for i in tree_data.get('tree', []) if i.get('type') == 'blob'}

raw = subprocess.check_output(
    ['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=ROOT
).decode('utf-8', 'replace').split('\0')

paths = [p for p in raw if p and os.path.isfile(os.path.join(ROOT, p))]
if paths:
    hashes = subprocess.check_output(
        ['git', 'hash-object', '--stdin-paths'],
        input=('\n'.join(paths) + '\n').encode('utf-8'), cwd=ROOT
    ).decode('ascii', 'replace').splitlines()
    local = dict(zip(paths, hashes))
else:
    local = {}

# 第一遍用裸哈希筛候选；Windows 上 core.autocrlf 会让裸哈希与 git blob 不一致，
# 所以对候选再用 --path 应用 Git 过滤器重算，避免把 CRLF 假差异推上去。
candidates = [p for p, s in local.items() if remote.get(p) != s]
for path in candidates:
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        local.pop(path, None)  # 并发写入时被删除/改名，跳过
        continue
    content = open(full, 'rb').read()
    filtered = subprocess.check_output(
        ['git', 'hash-object', '--path=' + path, '--stdin'],
        input=content, cwd=ROOT
    ).decode('ascii', 'replace').strip()
    local[path] = filtered

changed = {p: s for p, s in local.items() if remote.get(p) != s}
deleted = [p for p in remote if p not in local]

print('远端 HEAD:', head[:7], '| 远端文件:', len(remote), '| 本地文件:', len(local))
print('将新增/更新:', len(changed), '| 将删除:', len(deleted))
for p in sorted(changed)[:25]:
    print('  M/A', p)
if len(changed) > 25:
    print('  ... 另有', len(changed) - 25, '个')
for p in sorted(deleted)[:15]:
    print('  D  ', p)

if DRY:
    print('[dry-run] 未推送')
    sys.exit(0)

if not changed and not deleted:
    print('无差异，未创建提交')
    sys.exit(0)

entries = []
for path, _ in sorted(changed.items()):
    full = os.path.join(ROOT, path)
    content = base64.b64encode(open(full, 'rb').read()).decode('ascii')
    blob = api('POST', '/git/blobs', {'content': content, 'encoding': 'base64'})
    try:
        mode = git('ls-files', '-s', path).split()[0]
    except Exception:
        mode = '100755' if os.access(full, os.X_OK) else '100644'
    entries.append({'path': path, 'mode': mode, 'type': 'blob', 'sha': blob['sha']})

for path in sorted(deleted):
    entries.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': None})

tree = api('POST', '/git/trees', {'base_tree': base_tree, 'tree': entries})
commit = api('POST', '/git/commits', {
    'message': MESSAGE,
    'tree': tree['sha'],
    'parents': [head]
})
api('PATCH', '/git/refs/heads/' + BRANCH, {'sha': commit['sha'], 'force': False})
print('已推送，远端 HEAD:', commit['sha'][:7])
print('注意：本地 git 引用未同步，下次网络恢复后执行：git fetch origin && git reset --hard origin/' + BRANCH)
