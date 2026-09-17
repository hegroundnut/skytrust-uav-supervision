#!/usr/bin/env python3
"""serve-frontend.py —— 前端静态服务 + 同源 /api 反向代理（python3 标准库，无第三方依赖）。

后端（:8080）没有 CORS 头，浏览器直连跨域会被拦；本服务把前端静态文件与
API 代理收敛到同一源（默认 http://127.0.0.1:8090）：

    GET  /            → frontend/index.html 及静态资源
    POST /api/...     → 原样转发到 BACKEND（默认 http://127.0.0.1:8080），响应原样返回

用法：
    python3 scripts/serve-frontend.py                 # 默认 0.0.0.0:8090
    PORT=9000 BACKEND=http://127.0.0.1:8080 python3 scripts/serve-frontend.py
"""
import json
import os
import sys
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(REPO, "frontend")
BACKEND = os.environ.get("BACKEND", "http://127.0.0.1:8080").rstrip("/")
PORT = int(os.environ.get("PORT", "8090"))


class Handler(SimpleHTTPRequestHandler):
    # SPA：未知路径回退 index.html（本项目为单页应用，无多级路由）
    def do_POST(self):
        if not self.path.startswith("/api/"):
            self.send_error(405, "only /api/* accepts POST")
            return
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b"{}"
        req = urllib.request.Request(
            BACKEND + self.path, data=body, method="POST",
            headers={"Content-Type": self.headers.get("Content-Type", "application/json")},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload, status = resp.read(), resp.status
        except urllib.error.HTTPError as e:  # 后端 4xx/5xx 也原样透传
            payload, status = e.read(), e.code
        except (urllib.error.URLError, OSError) as e:
            payload = json.dumps(
                {"code": -1, "message": f"backend unreachable ({BACKEND}): {e}", "data": None},
                ensure_ascii=False).encode()
            status = 502
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):  # 降噪：只留错误
        if not str(args[1] if len(args) > 1 else "").startswith(("2", "3")):
            super().log_message(fmt, *args)


def main():
    if not os.path.isdir(FRONTEND_DIR):
        sys.exit(f"frontend dir not found: {FRONTEND_DIR}")
    handler = partial(Handler, directory=FRONTEND_DIR)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), handler)
    print(f"[serve-frontend] http://127.0.0.1:{PORT}  →  static {FRONTEND_DIR}")
    print(f"[serve-frontend] POST /api/*  →  proxy {BACKEND}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[serve-frontend] bye")


if __name__ == "__main__":
    main()
