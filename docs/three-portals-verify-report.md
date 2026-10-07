# 三端验收故事 API 层验证报告（计划 B Task 15）

- 运行时间：2026-10-07 10:33:15（Asia/Shanghai）
- 运行环境：隔离 sim（后端 :18080 + 前端代理 :18090，DB/SM9 密钥在 /tmp，未触碰生产 :8080/:8090）
- 复现方式：`./scripts/verify-three-portals-story.sh`（失败自动保留现场；`KEEP_SIM=1` 强制保留）
- 断言输入值权威：`docs/demo-script.md`「剧情固定值速查表」

## 运行输出（全量）

```text

══ 环境准备：隔离 sim 后端 :18080（DB/密钥 → /tmp/skytrust-verify-1416428） ══
  ✓ go build ./cmd/server（hermetic sim 构建）
  ✓ 隔离后端 60s 内就绪（health/ping）（= 1）

══ 前端产物门：文件存在性 + node --check + 三端 HTML 经代理可达 ══
  ✓ 三端全部产物文件存在（4 HTML + 4 CSS + 共享底座 + vendor + 20 页 + demo-script）
  ✓ frontend/js 全部 JS node --check 通过
  ✓ GET :18090/operator.html（= 200）
  ✓ GET :18090/authority.html（= 200）
  ✓ GET :18090/regulator.html（= 200）
  ✓ GET :18090/index.html（= 200）
  ✓ operator.html 引用 shell-op.js
  ✓ authority.html 引用 shell-au.js
  ✓ regulator.html 引用 shell-rg.js
  ✓ 代理链路 :18090/api/* → :18080（= 0）

══ 第 0 章 · 开场整备（demo/reset + demo/init + 三链 + 种子计数） ══
  ✓ demo/reset → code（= 0）
  ✓ demo/init → code（= 0）
  ✓ chain/status → code（= 0）
  ✓ 链 chainmaker 状态（= ONLINE）
  ✓ 链 fabric 状态（= ONLINE）
  ✓ 链 fisco-bcos 状态（= ONLINE）
  ✓ 种子厂商数（= 3）
  ✓ 种子运营商数（= 3）
  ✓ 种子航空器数（= 7）
  ✓ 种子航段数（= 5）
  ✓ 种子节点数（= 8）

══ 第 1 章 · 建档（主数据 + 走廊 + 实名 + 执照 + 验签 + 航空器注册即核验） ══
  ✓ operator/register Operator-MED → code（= 0）
  ✓ manufacturer/register Manufacturer-MED → code（= 0）
  ✓ route/create R-MED-01（显式四坐标） → code（= 0）
  ✓ 回执航段号（= R-MED-01）
  ✓ realname/register（模拟证件号） → code（= 0）
  ✓ 主体号 RNS- 前缀（RNS-eaafdcadfec5）
  ✓ pilot/apply 即申即发 → code（= 0）
  ✓ 执照状态（= ISSUED）
  ✓ 执照编号 UAV-PILOT-2026- 前缀
  ✓ crypto/sm9/verify（pilotCanonical 七键） → code（= 0）
  ✓ 局方签名验签 valid（= true）
  ✓ uav/register UAV-MED-01（显式 ID） → code（= 0）
  ✓ 注册即核验（无 VERIFY 步）（= VERIFIED）
  ✓ 登记标志 UAS- 前缀
  ✓ UAV_REGISTER_PROOF 跨链（= SUCCESS）
  ✓ 四段 TxID source_chain_tx_id
  ✓ 四段 TxID reg_receive_tx_id
  ✓ 四段 TxID reg_relay_tx_id
  ✓ 四段 TxID target_chain_tx_id

══ 第 2 章 · 任务申请（医疗任务 + B 任务 + 冲突检出/消解 + 3004 防重放） ══
  ✓ mission/create 医疗任务（相对时窗 +1h~+4h） → code（= 0）
  ✓ 医疗任务号生成
  ✓ mission/query → code（= 0）
  ✓ 查询响应无明文（金丝雀取 >4 字明文子串——C19 脱敏合法保留前 4 字「特殊血样****」，mission.go:60-65）（不含「特殊血样（RH 阴性）」）
  ✓ mission/submit 医疗任务跨域（operator=归属运营方——mission.go:307 归属校验，角色常量必 1001） → code（= 0）
  ✓ MISSION_APPLICATION 跨链（= SUCCESS）
  ✓ 医疗申请号生成（APP-——review/submit 的键是申请号非任务号，review.go:43）
  ✓ mission/create B 任务（同走廊/高度交叉/时窗重叠） → code（= 0）
  ✓ B 任务号生成
  ✓ mission/submit B 任务跨域 → code（= 0）
  ✓ B 申请号生成（APP-）
  ✓ conflict/detect → code（= 0）
  ✓ 冲突命中数（1 ≥ 1）
  ✓ 冲突 ID 生成
  ✓ 冲突任务对含 B 任务（含「MISSION-2026-002」）
  ✓ conflict/resolve 提交消解（mission_id 留空=双方 COORDINATING→REVIEWING，conflict.go:132-133） → code（= 0）
  ✓ 医疗任务同回 REVIEWING（双方释放——若单放 B 则医疗滞留 COORDINATING，第 3 章审核必 3004）（= REVIEWING）
  ✓ 重复消解（设计内拒绝·附录 B——非 OPEN 守卫先于 targets 逻辑，conflict.go:146-147） → code（= 3004）

══ 第 3 章 · 审核与许可（双 APPROVED + 显式 PASS-2026-001 签发 + 验证绿灯） ══
  ✓ review/submit 医疗任务裁决 → code（= 0）
  ✓ 医疗任务状态（= APPROVED）
  ✓ MISSION_REVIEW_RESULT 跨链回传（= SUCCESS）
  ✓ review/submit B 任务裁决 → code（= 0）
  ✓ B 任务状态（= APPROVED）
  ✓ pass/issue（显式许可号 + 相对窗 −1h~+4h） → code（= 0）
  ✓ 许可号（= PASS-2026-001）
  ✓ FLIGHT_PASS 跨链（= SUCCESS）
  ✓ pass/verify（铁律：存在的许可恒 code=0） → code（= 0）
  ✓ 签发后验证绿灯（= true）

══ 第 4 章 · 起飞（接入点注册 + 起飞报备 + SIM 遥测自动驾驶） ══
  ✓ node/register UAV-MED-01-NODE（session/open 前置） → code（= 0）
  ✓ 节点状态（= ONLINE）
  ✓ session/open 起飞报备（关联任务+许可） → code（= 0）
  ✓ 会话号生成
  ✓ 会话状态（= ACTIVE）
  ✓ SM9 挑战-应答（= true）
  ✓ 初始可信路径节点数（= 6）
  ✓ 路径含接入点（含「UAV-MED-01-NODE」）
  ✓ SIM 遥测 24s 内出现（自动驾驶沿 R-MED-01 走廊）（= 1）
  ✓ 遥测来源（= SIM）
  ✓ 遥测 seq（1 ≥ 1）

══ 第 5 章 · 攻防（开洞诱入 → DETECT/DEGRADED → 遥测停摆 → 恢复 → 4001 残留） ══
  ✓ 开洞前网络边（种子 5 + 第 4 章注册 UAV-MED-01-NODE 增 1——netsec 统计卡为原始 edges.length）（= 6）
  ✓ wormhole/toggle 开启 → code（= 0）
  ✓ 虫洞开启中（= true）
  ✓ 受影响节点数（= 4）
  ✓ 开洞后网络边 6→9（+N1↔X、X↔Y、Y↔N4 三条虫洞边，wormhole.go:102-111）（= 9）
  ✓ message/send 诱入消息 → code（= 0）
  ✓ 消息被诱入隧道（path 含 NODE-X）（含「NODE-X」）
  ✓ 隧道时延低于地理下限 35.36ms（快得反常）（29 < 35）
  ✓ risk/evaluate → code（= 0）
  ✓ 裁定 DETECT（= DETECT）
  ✓ 风险分 ≥ 阈值（0.85 ≥ 0.7）
  ✓ 会话降级（= DEGRADED）
  ✓ 联动事件（DETECT+ISOLATE）（2 ≥ 2）
  ✓ 停摆断言非空洞前提（降级前已有真实遥测——杜绝 0==0 假绿）（1 ≥ 1）
  ✓ DEGRADED 期间遥测停摆（seq 冻结——跨端停摆机制）（= 1）
  ✓ path/switch 自动重算 → code（= 0）
  ✓ 会话 RECOVERED（= RECOVERED）
  ✓ 新路径排除隔离节点（不含「NODE-X」）
  ✓ message/send 确认消息（干净路径） → code（= 0）
  ✓ 确认消息不入隧道（不含「NODE-X」）
  ✓ 消息流通后会话自动回归 ACTIVE（= ACTIVE）
  ✓ ACTIVE 回归后遥测恢复增长（无人机复飞）（= 1）
  ✓ 隔离后重开虫洞（设计内拒绝·附录 B） → code（= 4001）

══ 第 6 章 · 追踪（告警登记 + 全链可溯 + 5001 断链红线 + 状态机推进） ══
  ✓ alert/raise（显式告警号） → code（= 0）
  ✓ 告警号（= ALERT-2026-001）
  ✓ 告警初始状态（= OPEN）
  ✓ trace/identity 告警入口 → code（= 0）
  ✓ 全链可溯 resolved（= true）
  ✓ break_level=0（= 0）
  ✓ 七级时间线（= 7）
  ✓ L3 命中第 3 章显式签发的许可（含「PASS-2026-001」）
  ✓ 追踪未登记伪名（断链红线·附录 B） → code（= 5001）
  ✓ L2-7 skipped 不拼造（含「skipped: break at level 1」）
  ✓ alert/status → IDENTIFIED → code（= 0）
  ✓ 推进后状态（= IDENTIFIED）
  ✓ alert/status → TRACED → code（= 0）
  ✓ 推进后状态（= TRACED）
  ✓ alert/status → REVIEWED → code（= 0）
  ✓ 推进后状态（= REVIEWED）
  ✓ alert/status → RESOLVED → code（= 0）
  ✓ 推进后状态（= RESOLVED）

══ 第 7 章 · 授权开箱（AUTH-2026-001 + 5002 封缄 + 开箱明文 + 篡改闭环） ══
  ✓ authorize/apply（显式授权号 + 四项 scope + 相对窗） → code（= 0）
  ✓ 授权号（= AUTH-2026-001）
  ✓ authorize/review APPROVE → code（= 0）
  ✓ 裁决后 AUTHORIZED（已上链）（含「AUTHORIZED」）
  ✓ 无授权核验（封缄·附录 B） → code（= 5002）
  ✓ authorized=false（= false）
  ✓ 封缄元数据可见（= true）
  ✓ 明文绝不进错误信封（金丝雀 >4 字——封缄合法含脱敏前缀「特殊血样****」，C19）（不含「特殊血样（RH 阴性）」）
  ✓ inspect/ciphertext 带授权开箱（申报轨迹留空） → code（= 0）
  ✓ authorized=true（= true）
  ✓ 明文重现（仅此角色仅此授权）（含「特殊血样」）
  ✓ 完整性·摘要匹配（= true）
  ✓ 完整性·签名有效（= true）
  ✓ 载荷一致裁定（= PAYLOAD_OK）
  ✓ 轨迹留空 → 航线不裁定（纪律成文）（= NOT_CHECKED）
  ✓ 核验结论上链
  ✓ crypto/sm3 → code（= 0）
  ✓ SM3 摘要 64hex（= 64）
  ✓ crypto/sm9/keygen → code（= 0）
  ✓ crypto/sm9/sign → code（= 0）
  ✓ crypto/sm9/verify 原载荷 → code（= 0）
  ✓ 验签通过（= true）
  ✓ 篡改后复验（code 仍 0——铁律） → code（= 0）
  ✓ altitude_max→999 验签失败（= false）

══ 第 8 章 · 收尾（降落 + 4002 + 吊销红灯 + ACTIVATE + 1004 守卫 + 审计/流水盘点） ══
  ✓ session/close 降落报备 → code（= 0）
  ✓ 会话 CLOSED（= CLOSED）
  ✓ 对 CLOSED 会话发消息（设计内拒绝） → code（= 4002）
  ✓ pass/revoke（本地先行） → code（= 0）
  ✓ 许可 REVOKED（含「REVOKED」）
  ✓ 吊销后 pass/verify（铁律：code 恒 0） → code（= 0）
  ✓ 红灯 valid=false（= false）
  ✓ reasons 说明吊销（含「吊销」）
  ✓ uav/status ACTIVATE（VERIFIED→ACTIVE 收尾） → code（= 0）
  ✓ 航空器终态（= ACTIVE）
  ✓ 重复 ACTIVATE（状态机守卫·附录 B） → code（= 1004）
  ✓ 对 ACTIVE 机 VERIFY（仅 REGISTERED 起点·附录 B） → code（= 1004）
  ✓ regulatory/audit/export → code（= 0）
  ✓ 监管审计流水行数（2 ≥ 1）
  ✓ audit/export → code（= 0）
  ✓ 全量审计日志行数（20 ≥ 1）
  ✓ 跨链流水 MISSION_APPLICATION 条数（2 ≥ 1）
  ✓ MISSION_APPLICATION 全 SUCCESS（= 0）
  ✓ MISSION_APPLICATION 四段 TxID 齐全（= 0）
  ✓ 跨链流水 UAV_REGISTER_PROOF 条数（1 ≥ 1）
  ✓ UAV_REGISTER_PROOF 全 SUCCESS（= 0）
  ✓ UAV_REGISTER_PROOF 四段 TxID 齐全（= 0）
  ✓ 跨链流水 MISSION_REVIEW_RESULT 条数（2 ≥ 1）
  ✓ MISSION_REVIEW_RESULT 全 SUCCESS（= 0）
  ✓ MISSION_REVIEW_RESULT 四段 TxID 齐全（= 0）
  ✓ 跨链流水 FLIGHT_PASS 条数（1 ≥ 1）
  ✓ FLIGHT_PASS 全 SUCCESS（= 0）
  ✓ FLIGHT_PASS 四段 TxID 齐全（= 0）
  ✓ 跨链流水 PASS_REVOKE 条数（1 ≥ 1）
  ✓ PASS_REVOKE 全 SUCCESS（= 0）
  ✓ PASS_REVOKE 四段 TxID 齐全（= 0）
  ✓ dashboard/summary → code（= 0）
  ✓ 驾驶舱·告警总数（1 ≥ 1）
  ✓ 驾驶舱·虫洞检出（1 ≥ 1）
  ✓ 驾驶舱·关闭会话（1 ≥ 1）
  ✓ 驾驶舱·已授权（1 ≥ 1）

══ DEFERRED-HUMAN 汇总清单（Tasks 5-14 浏览器目检——API 断言不覆盖，人工按项核对） ══
【三端通用】
- 各端主题/侧边栏/顶栏 chip：op 政务蓝白 7 页、au 深蓝权威 6 页、rg 深藏青 7 页；六类 chip 跨端预填
- 天地图 key 引导弹窗 + 退化徽章 + 矢量层恒自绘；三链心跳灯；hash 路由兜底「页面未注册」卡（非白屏）
【运营商端 operator.html】
- home：hero 地图、节点层无红色 ATTACKER/无虫洞边（信息边界）、六入口卡、态势条计数（网络节点=过滤后 6）
- realname：回执卡+身份条+「选为当前身份」、执照凭证卡、?subject_id= 深链、缺必填 toast 拦截
- aircraft：QR 可见、四段 TxID 全亮可点开存证抽屉、注销确认弹窗、遗留 NULL 标志回退文案
- flight：走廊三色着色、地图点选⇄勾选框双向同步、回执中文列表、冲突预填、3004 错误卡带解说
- license：电子许可卡 QR+mini-map、绿/红灯证面（绝不错误卡样式）、6002 解说
- ops：✈️ 沿走廊移动+heading 朝向、RID 卡、降落停驻、会话接管 toast、切页 3s 后轮询停止
- airspace：图例三色、节点层开关、zone/走廊过滤、航线详情卡、「坐标未设」文案
【管理当局端 authority.html】
- queue：审核状态列、工作台四段存证+历史+裁决表单、mini-map 高亮任务航段
- passes：许可卡、3002 重复签发解说、抽屉验证/吊销、吊销后 valid=false「许可已吊销」
- records：rules_hit 解析列表、空键 toast、MISSION_REVIEW_RESULT 流水抽屉
- registry：类型/类别过滤、七键验签材料 JSON 块、「模拟证件号」免责声明
- masterdata：两击蓝点+坐标回填（6 位小数）、第三击清空、半套坐标拦截、台账行高亮联动
- netsec：topo 统计卡+NODE-X/Y 红色可见（全量视角）、drill 红虚线隧道边+中点 ⚠、风险 5 维评分条+阈值线、逐跳时延条、experiment 成功率红绿+CSV BOM
【监管当局端 regulator.html】
- cockpit：5 统计卡 tone、地图 C 位全量节点+走廊多边形、✈️ 5s 刷新、告警红色落点、转追踪跳转预填
- alerts：9 字段表单、回执+推进预填、跨级 6002 中性错误卡（无「◈ 预期」徽章）
- trace：七级 chainTag 三色+时延、断点时间线 L1 BROKEN 红✕ + L2-7 skipped
- authz：scope 默认勾 ROUTE+PAYLOAD、相对窗预填、APPROVE 绿卡上链/DENY 红卡不上链、复审 6002
- inspect：5002 封缄卡五键无明文、开箱 3 统计卡+明文卡+12 行 kv、scope 无 MISSION → 明文空文案
- audit：四维/三维过滤、抽屉 JSON 原文、CSV 导出 BOM 头 Excel 可开
- crypto：canonical 键排序串、keygen 确定性同身份、篡改 valid=false 红卡、1002 非法签名解说
【验收故事全流程】
- 按 docs/demo-script.md 第 0-8 章完成约 30 分钟三标签页实演（附录 A 检查清单逐项勾选、
  附录 B 七行设计内拒绝现场复现、附录 C 时长核对）——正式验收以人工实演为准，本脚本仅 API 层

════════════════ 验证汇总 ════════════════
PASS=182  FAIL=0
ALL_GREEN —— 三端验收故事 API 层断言全部通过（浏览器目检见上方 DEFERRED-HUMAN 清单）
```
