#!/usr/bin/env bash
# gen-endpoints.sh —— 从 docs/apifox/skytrust-backend.openapi.json 重新生成
# frontend/js/data/endpoints.js（64 端点 + 录制样例，前端 API 浏览器的数据源）。
# 用法：./scripts/gen-endpoints.sh   （openapi 契约变更后执行）
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json
d = json.load(open('docs/apifox/skytrust-backend.openapi.json'))
tag_order = [t['name'] for t in d['tags']]
out = []
for path in sorted(d['paths']):
    post = d['paths'][path]['post']
    tag = (post.get('tags') or ['其他'])[0]
    j = post.get('requestBody', {}).get('content', {}).get('application/json', {})
    r = post.get('responses', {}).get('200', {}).get('content', {}).get('application/json', {}).get('examples', {})
    out.append({
        'path': path, 'tag': tag,
        'summary': post.get('summary', ''),
        'operationId': post.get('operationId', ''),
        'req': j.get('example', {}),
        'resp': r.get('success', {}).get('value'),
        'err': r.get('business_error', {}).get('value'),
    })
out.sort(key=lambda e: (tag_order.index(e['tag']) if e['tag'] in tag_order else 99, e['path']))
js = ('// 由 docs/apifox/skytrust-backend.openapi.json 生成（64 端点全量，含录制样例）。\n'
      '// 请勿手改：重新生成命令 ./scripts/gen-endpoints.sh。\n'
      'window.ENDPOINTS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n'
      'window.TAG_ORDER = ' + json.dumps(tag_order, ensure_ascii=False) + ';\n')
open('frontend/js/data/endpoints.js', 'w').write(js)
print(f'generated frontend/js/data/endpoints.js: {len(out)} endpoints, {len(js.encode())} bytes')
PY
