"""复用远端已有 blob，只上传本地新增对象，一次提交完成合并推送。"""
import base64, json, os, subprocess, sys, time, urllib.request
T = os.environ.get('GITHUB_TOKEN', '')
API = 'https://api.github.com/repos/quark007/3D-'
ROOT = os.getcwd()

def req(method, path, data=None, tries=6):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    r = urllib.request.Request(API + path, data=body, method=method, headers={
        'Authorization': 'Bearer ' + T, 'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json', 'User-Agent': 'merge-api-push'})
    for i in range(tries):
        try:
            with urllib.request.urlopen(r, timeout=180) as resp:
                return json.load(resp)
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(1 + i)

def git(*a):
    return subprocess.check_output(('git',) + a, cwd=ROOT).decode('utf-8', 'replace').strip()

head = req('GET', '/git/ref/heads/main')['object']['sha']
base_tree = req('GET', '/git/commits/' + head)['tree']['sha']
print('远端 HEAD', head[:7], flush=True)

remote = set()
for ref in ['main', 'feat%2Fzunyi-full-integration']:
    t = req('GET', '/git/trees/' + ref + '?recursive=1')
    remote.update(i['sha'] for i in t['tree'] if i['type'] == 'blob')
print('远端已有 blob', len(remote), flush=True)

idx = {}
for line in git('ls-files', '-s').splitlines():
    meta, path = line.split('\t', 1)
    idx[path] = meta.split()[1]

changes = [l.split('\t', 1) for l in git('diff', '--name-status', '9d3c0bb..HEAD').splitlines()]
entries = []
uploaded = 0
for st, path in changes:
    if st.startswith('D'):
        entries.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': None})
        continue
    sha = idx[path]
    if sha not in remote:
        raw = open(os.path.join(ROOT, path), 'rb').read()
        b = req('POST', '/git/blobs', {'content': base64.b64encode(raw).decode(), 'encoding': 'base64'})
        sha = b['sha']
        uploaded += 1
    entries.append({'path': path, 'mode': idx.get(path, '100644').split()[0] if False else '100644', 'type': 'blob', 'sha': sha})

print('新上传', uploaded, '个 blob | tree entries', len(entries), flush=True)
tree = req('POST', '/git/trees', {'base_tree': base_tree, 'tree': entries})
msg = git('log', '-1', '--format=%B', 'HEAD')
commit = req('POST', '/git/commits', {'message': msg, 'tree': tree['sha'], 'parents': [head]})
req('PATCH', '/git/refs/heads/main', {'sha': commit['sha'], 'force': False})
print('PUSHED', commit['sha'][:7], flush=True)
