# 四端验收故事 API 层验证报告（四链计划 Task 11 · C-3 门证据留档）

- 运行结果：**PASS=259  FAIL=0 → ALL_GREEN**（`bash` 退出码 0）
- 运行时间（Asia/Shanghai）：Run 1 完成于 2026-10-14 01:13:42；Run 2（稳定性复核）完成于 2026-10-14 01:16:24——两轮断言逐条一致，仅动态值不同（RNS 主体号、sim TxID 哈希、现场目录 PID；chainmaker 块高 35 两轮精确复现）
- 运行环境：隔离 sim（脚本自起专属后端 + 前端代理，DB/SM9 密钥在 `/tmp/skytrust-verify-<PID>`，跑毕自动清理并已复核：临时目录已删、端口已释放、无残留进程）
- **端口替换记录（如实登记）**：脚本默认口 :18080/:18090，其中 **:18080 被外来用户服务占用（红线：绝不触碰/绝不杀）**——按脚本头部第 14 行自带逃生口以 `BACK_PORT=18180 FRONT_PORT=18190` 换口全程实跑。脚本对生产 :8080/:8090 的硬编码拒绝逻辑原样保留；生产 :8080/:15001 全程零接触（测后 `ss -tln` 复核仍在监听）
- 复现方式：`BACK_PORT=18180 FRONT_PORT=18190 ./scripts/verify-three-portals-story.sh`（脚本原名保留；失败自动保留现场，`KEEP_SIM=1` 强制保留）
- 断言输入值权威：`docs/demo-script.md`「剧情固定值速查表」（第 0-8 章三端剧情原样保留）+ 四链计划 Task 11 brief（第 3b/9 章与产物门）+ 计划「Task 9 校准实录」（plan commit 3c3bccc——第 5b 章 a/b/c 三断言）+「Task 4 校准裁决」（能力降级码 = 2005，非 5003）
- 语法门：`bash -n scripts/verify-three-portals-story.sh` 通过；`find frontend/js -name '*.js' -exec node --check {} \;` 全部通过
- 对照三端版基线（docs/three-portals-verify-report.md：PASS=182）：**+77 条断言**，构成：前端产物门 +9（license-center GET/shell-ct 引用/CXV 挂载 ×5/WTOPO 挂载/「最近 200 条」小字逐字）、第 0 章四链链灯 +2（count=4 + irita ONLINE）、第 3b 章证照中心端签发 +16、第 5b 章虫洞拓扑数据面 +19、第 9 章四端浏览器数据面 +31

## 四链计划新增断言组（摘要；全文见下方 Run 1 原样输出）

- **产物门四端化**：`四端全部产物文件存在（5 HTML + 5 CSS + 共享底座含 shell-ct/CXV/WTOPO + vendor + 25 业务页 + 5 浏览器挂载页 + demo-script）`；license-center.html 经代理 200 且引用 shell-ct.js；四端 + index 五处 HTML 均挂载 `js/chainview.js`；authority.html 挂载 `js/wormhole-topo.js`；CXV 固定小字「服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选」在 chainview.js 逐字命中（Review Focus 5）
- **第 0 章四链链灯**：chain/status `count=4`，chainmaker/fabric/fisco-bcos/**irita** 全 ONLINE
- **第 3b 章 证照中心端签发**（Task 7 curl-flow 先例）：B 任务（APPROVED，种子主数据 Operator-B/UAV-B-001）→ `pass/issue`（issuer=REGISTRY-ADMIN，显式 PASS-2026-002）code 0 + VALID + 跨链 SUCCESS + `source_chain=irita` + 源链 TxID 前缀 `IRITA-`（回执与 crosschain/list 双处断言）+ `sm9_identity=SM9-ID-REGISTRY-ADMIN`；同 pass_id 重复签发 → **3002**（设计内拒绝）；`pass/verify` code 0 + valid=true（envelope 恒 0 铁律）；pass/list VALID total=2（ct 台账数据源）
- **第 5b 章 虫洞拓扑数据面**（按「Task 9 校准实录」a/b/c，BINDING）：
  - (a) topology/get 含 NODE-X/Y 且 position 非空；lat/lon = 30.556/114.356 与 30.64/114.44（seed.go:120-121 回填的真实模拟坐标——**两层皆现属红线正确行为**，本脚本不断言 NODE-X/Y ∉ Leaflet 输入）；隔离后 status=ISOLATED 如实
  - (b) 探针 NODE-PROBE-T11（仅 position {"X":62,"Y":8}、无 lat/lon）注册成功 → topology/get 回显 position、lat=0/lon=0（GEO.nodeCoord 判 null → ∉Leaflet 可绘集 ∧ ∈WTOPO 布点集——分裂实证）；neighbors=[] 零扰动（边仍 6）
  - (c) 无 position 注册 → **6002**（binding:"required" 数据面门——未布点节点进不了系统）；被拒节点诚实缺席；拓扑内零无-position 节点（「未布点」侧清单 DOM 目检 = DEFERRED-HUMAN【虫洞拓扑】）
  - 节点台账总数 = 10（种子 8 + 第 4 章接入点 + 探针）
- **第 9 章 四端浏览器数据面（CXV/explorer）**：overview 四链 count=4、全 ONLINE、mode=sim 如实标注、sim 单节点如实计数、块高 ≥1；固定显示值逐字断言 ×8（`ChainMaker 监管链`/`TBFT（4 节点）`、`Fabric 运营链`/`SMARTBFT（4 orderer）`、`FISCO BCOS 管理链`/`PBFT（4 sealer）`、`IRITA 证照链`/`Tendermint BFT（4 验证人）`）；nodes source=sim；blocks limit 截断 + 新→旧首条=当前高度；block 详情按高度回查；**explorer/tx 以第 3b 章 CT 许可目标链留痕 TxID 链上直查命中**（业务 TxID 可回查闭环）；可构造负路径 ×4 → 6002（未知链 / height=0 binding 怪癖（Task 8 交接）/ 块高越界 / 不存在 TxID）
- **2005 边界（Task 4 校准裁决）**：能力降级码 = **2005**（非 5003——5003=AuthScope 语义唯一）。隔离 sim 四链全实现 BlockQuerier → 2005 对 sim **不可构造、绝不伪造触发**；实弹（FISCO v3.16 getBlockByNumber 怪癖等）归真链验收窗（**Task 14**），已写入 DEFERRED-HUMAN【四端浏览器】

## 运行输出（全量——Run 1 原样，仅端口为换口值 :18180/:18190）

```text

══ 环境准备：隔离 sim 后端 :18180（DB/密钥 → /tmp/skytrust-verify-3414405） ══
  ✓ go build ./cmd/server（hermetic sim 构建）
  ✓ 隔离后端 60s 内就绪（health/ping）（= 1）

══ 前端产物门：文件存在性 + node --check + 四端 HTML 经代理可达 + CXV/WTOPO 挂载 ══
  ✓ 四端全部产物文件存在（5 HTML + 5 CSS + 共享底座含 shell-ct/CXV/WTOPO + vendor + 25 业务页 + 5 浏览器挂载页 + demo-script）
  ✓ frontend/js 全部 JS node --check 通过
  ✓ GET :18190/operator.html（= 200）
  ✓ GET :18190/authority.html（= 200）
  ✓ GET :18190/regulator.html（= 200）
  ✓ GET :18190/license-center.html（= 200）
  ✓ GET :18190/index.html（= 200）
  ✓ operator.html 引用 shell-op.js
  ✓ authority.html 引用 shell-au.js
  ✓ regulator.html 引用 shell-rg.js
  ✓ license-center.html 引用 shell-ct.js
  ✓ operator.html 挂载 CXV 浏览器共享模块（js/chainview.js）
  ✓ authority.html 挂载 CXV 浏览器共享模块（js/chainview.js）
  ✓ regulator.html 挂载 CXV 浏览器共享模块（js/chainview.js）
  ✓ license-center.html 挂载 CXV 浏览器共享模块（js/chainview.js）
  ✓ index.html 挂载 CXV 浏览器共享模块（js/chainview.js）
  ✓ authority.html 挂载 WTOPO（js/wormhole-topo.js）
  ✓ CXV 固定小字逐字存在「…最近 200 条内客户端筛选」（Review Focus 5——chainview.js SMALL_PRINT）
  ✓ 代理链路 :18190/api/* → :18180（= 0）

══ 第 0 章 · 开场整备（demo/reset + demo/init + 四链 + 种子计数） ══
  ✓ demo/reset → code（= 0）
  ✓ demo/init → code（= 0）
  ✓ chain/status → code（= 0）
  ✓ 接入链数（四链形态：监管 ChainMaker + 运营 Fabric + 管理 FISCO BCOS + 证照 IRITA）（= 4）
  ✓ 链 chainmaker 状态（= ONLINE）
  ✓ 链 fabric 状态（= ONLINE）
  ✓ 链 fisco-bcos 状态（= ONLINE）
  ✓ 链 irita 状态（= ONLINE）
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
  ✓ 主体号 RNS- 前缀（RNS-3673975d3f26）
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

══ 第 3b 章 · 证照中心端签发（四链剧情扩展——REGISTRY-ADMIN 现行身份 + IRITA 源链 + 3002 防重发） ══
  ✓ pass/issue 证照中心端签发（issuer=REGISTRY-ADMIN，B 任务 APPROVED） → code（= 0）
  ✓ CT 许可状态 VALID（= VALID）
  ✓ FLIGHT_PASS 跨链（证照链→监管链中继→运营链）（= SUCCESS）
  ✓ 源链 = irita（Task 3 迁移后签发源链，不再 fisco-bcos）（= irita）
  ✓ 最终目标链 = fabric（= fabric）
  ✓ 签发回执源链 TxID 前缀 IRITA-（IRITA-e980b6f64d820d4924e5880bfd972333）
  ✓ 目标链 TxID 非空（第 9 章 explorer/tx 链上直查素材）
  ✓ 跨链 SM9 签名身份 = 现行签发方（= SM9-ID-REGISTRY-ADMIN）
  ✓ 同 pass_id 重复签发（设计内拒绝·VALID 不可重复签发，pass.go:135） → code（= 3002）
  ✓ pass/verify CT 许可（铁律：存在的许可恒 code=0） → code（= 0）
  ✓ CT 许可验证绿灯 valid=true（= true）
  ✓ pass/list VALID（ct 台账数据源） → code（= 0）
  ✓ 台账 VALID 总数（PASS-2026-001 医疗 + PASS-2026-002 CT）（= 2）
  ✓ crosschain/list FLIGHT_PASS → code（= 0）
  ✓ 跨链台账命中 CT 许可留痕（business_id=PASS-2026-002）（= 1）
  ✓ crosschain/list CT 留痕 source_chain_tx_id 前缀 IRITA-（IRITA-e980b6f64d820d4924e5880bfd972333）

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

══ 第 5b 章 · 虫洞拓扑数据面（WTOPO 坐标红线——按 plan「Task 9 校准实录」a/b/c 三断言） ══
  ✓ topology/get（隔离态下仍全量如实——攻击者在数据面可见） → code（= 0）
  ✓ (a) NODE-X ∈ topology 且 position 非空（有 position 必入 WTOPO 布点集）
  ✓ (a) NODE-Y ∈ topology 且 position 非空
  ✓ (a) NODE-X lat=30.556（Task 9 校准后前提：真实模拟坐标——两层皆现属红线正确行为）（= 30.556）
  ✓ (a) NODE-X lon=114.356（= 114.356）
  ✓ (a) NODE-Y lat=30.64（种子值 30.640 之 JSON 最短形态）（= 30.64）
  ✓ (a) NODE-Y lon=114.44（种子值 114.440）（= 114.44）
  ✓ (a) NODE-X 隔离后状态如实（第 5 章 ISOLATE 落地——WTOPO 红虚线描边+⛔ 数据源）（= ISOLATED）
  ✓ (a) NODE-Y 隔离后状态如实（= ISOLATED）
  ✓ (b) node/register 探针（仅 position、无 lat/lon——Task 9 L3 分裂机制先例；sm9_identity 留空自动派生） → code（= 0）
  ✓ topology/get（探针注册后） → code（= 0）
  ✓ (b) 探针 position 回显（API 注册大写键——WTOPO posOf x/X 双兼容）（= {"X":62,"Y":8}）
  ✓ (b) 探针 lat=0（未设语义——GEO.nodeCoord 判 null，永不落 Leaflet）（= 0）
  ✓ (b) 探针 lon=0（∈WTOPO ∧ ∉Leaflet——分裂实证数据面）（= 0）
  ✓ (b) 探针 neighbors=[] → 边仍 6（隔离后 X/Y 退出 ONLINE 边集 9→6；探针零扰动）（= 6）
  ✓ (c) node/register 缺 position → 6002（binding:"required" 数据面门——无 position 节点进不了系统） → code（= 6002）
  ✓ (c) 被拒节点未入拓扑（诚实缺席——绝不编造默认布点）（= 0）
  ✓ (c) 拓扑内零无-position 节点（本场 sim 数据面「未布点」清单恒空——DOM 侧清单目检 = DEFERRED-HUMAN）（= 0）
  ✓ 节点台账总数（种子 8 + 第 4 章接入点 + 探针 = 10；被拒注册不计入）（= 10）

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
  ✓ 明文重现（仅此角色仅此授权）（含「（RH 阴性）」）
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
  ✓ 跨链流水 FLIGHT_PASS 条数（2 ≥ 1）
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

══ 第 9 章 · 四端区块链浏览器数据面（CXV/explorer——四链总览 + 块浏览 + 链上直查 + 负路径） ══
  ✓ explorer/overview → code（= 0）
  ✓ 四链总览 count=4（= 4）
  ✓ 四链 ONLINE（overview 与 chain/status 链灯同源）（= 4）
  ✓ 四链 mode=sim（隔离环境如实标注——real 只属真链部署）（= 4）
  ✓ sim 单节点如实计数（绝不冒充 4 节点集群）（= 4）
  ✓ 四链块高 ≥1（本场剧情真实写入——sim 一笔交易一个块）（= 4）
  ✓ chainmaker 显示名逐字（= ChainMaker 监管链）
  ✓ chainmaker 共识串逐字（= TBFT（4 节点））
  ✓ fabric 显示名逐字（= Fabric 运营链）
  ✓ fabric 共识串逐字（= SMARTBFT（4 orderer））
  ✓ fisco-bcos 显示名逐字（= FISCO BCOS 管理链）
  ✓ fisco-bcos 共识串逐字（= PBFT（4 sealer））
  ✓ irita 显示名逐字（= IRITA 证照链）
  ✓ irita 共识串逐字（= Tendermint BFT（4 验证人））
  ✓ explorer/nodes irita → code（= 0）
  ✓ irita 节点列表（sim 单节点）（= 1）
  ✓ 节点 source=sim 如实标注（绝不冒充链原生 RPC 结果）（= sim）
  ✓ explorer/blocks chainmaker（limit=5） → code（= 0）
  ✓ 监管链当前块高（35 ≥ 1）
  ✓ 最近块列表按 limit=5 截断（= 5）
  ✓ 块列表新→旧（首条 = 当前高度）（= 35）
  ✓ explorer/block chainmaker@35（按高度取块详情） → code（= 0）
  ✓ 块高回显（= 35）
  ✓ 块 hash 非空
  ✓ 块内交易数（1 ≥ 1）
  ✓ explorer/tx fabric（CT 许可目标链留痕链上直查——业务 TxID 可回查） → code（= 0）
  ✓ 链上直查 TxID 回显（= FABRIC-5652a8b57aeead58ef02aecd6d7268c2）
  ✓ 未知链 → 6002（可构造负路径——不猜测、不拼造显示名） → code（= 6002）
  ✓ height=0 → 6002（binding:"required" 怪癖，Task 8 交接——0 亦非合法块高，sim 块从 1 起） → code（= 6002）
  ✓ 块高越界 → 6002（如实拒绝——绝不拼造区块） → code（= 6002）
  ✓ 不存在 TxID → 6002（链上直查诚实报缺） → code（= 6002）

══ DEFERRED-HUMAN 汇总清单（浏览器目检——API 断言不覆盖，人工按项核对） ══
【四端通用】
- 各端主题/侧边栏/顶栏 chip：op 政务蓝白业务 7 页、au 深蓝权威业务 6 页、rg 深藏青业务 7 页、
  ct 证照暗色业务 5 页；每端另挂「链上浏览器」1 页；六类 chip 跨端预填
- 天地图 key 引导弹窗 + 退化徽章 + 矢量层恒自绘；四链心跳灯（含 irita 证照链）；hash 路由兜底
  「页面未注册」卡（非白屏）
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
- passes：只读台账 + 顶部通告条「通行证签发/吊销已移交证照中心端」+ license-center.html 入口链接
  （Task 10 降级——签发/吊销操作件已移除）；行抽屉 pass/query 详情 + pass/verify 验证绿/红灯；
  吊销后 valid=false「许可已吊销」
- records：rules_hit 解析列表、空键 toast、MISSION_REVIEW_RESULT 流水抽屉
- registry：类型/类别过滤、七键验签材料 JSON 块、「模拟证件号」免责声明
- masterdata：两击蓝点+坐标回填（6 位小数）、第三击清空、半套坐标拦截、台账行高亮联动
- netsec：topo 统计卡+NODE-X/Y 红色可见（全量地理视角）、WTOPO 抽象拓扑区块（地理层下方——
  详见【虫洞拓扑】）、drill 红虚线隧道边+中点 ⚠、风险 5 维评分条+阈值线、逐跳时延条、
  experiment 成功率红绿+CSV BOM
【监管当局端 regulator.html】
- cockpit：5 统计卡 tone、地图 C 位全量节点+走廊多边形、✈️ 5s 刷新、告警红色落点、转追踪跳转预填
- alerts：9 字段表单、回执+推进预填、跨级 6002 中性错误卡（无「◈ 预期」徽章）
- trace：七级 chainTag 三色+时延、断点时间线 L1 BROKEN 红✕ + L2-7 skipped
- authz：scope 默认勾 ROUTE+PAYLOAD、相对窗预填、APPROVE 绿卡上链/DENY 红卡不上链、复审 6002
- inspect：5002 封缄卡五键无明文、开箱 3 统计卡+明文卡+12 行 kv、scope 无 MISSION → 明文空文案
- audit：四维/三维过滤、抽屉 JSON 原文、CSV 导出 BOM 头 Excel 可开
- crypto：canonical 键排序串、keygen 确定性同身份、篡改 valid=false 红卡、1002 非法签名解说
【证照中心端 license-center.html】
- home：证照总览 + 三大核心能力卡（CAPX）+ 四入口导航；ct 暗色主题对比度/表格密度
- issue：待签发表格（APPROVED ⋈ 无 pass）、issuer=REGISTRY-ADMIN 只读展示（非表单字段）、
  ±1h 默认窗 +「两键清空=回退任务窗」hint、进行中态 spinner（跨链约 3-6s 预期管理）、
  成功卡 QR + 四段 TxID 点开存证抽屉、失败 errCard + 解说 +「同 pass_id 可重试」提示
- ledger：状态过滤、行抽屉 11 键全量 + SM9 签名身份区（REGISTRY-ADMIN 现行 / FISCO-ADMIN 历史
  双身份过渡说明）、「最近 N 条」窗口注记、无留痕诚实空态「无法链上溯源，绝不按日期猜测」
- verify：绿/红灯证面（envelope 恒 code 0——valid/reasons 数据化渲染，红灯绝不错误卡样式）、
  6002 不存在解说卡、深链 #/verify?pass_id= 预填
- revoke：确认弹窗三条后果文案（本地先行 REVOKED 不可逆 / 跨链 best-effort / 仅 VALID 可吊销）、
  跨链失败黄条如实展示 + 补发 busy 态（sim 跨链恒成功无法自然构造——真链验收时看一眼）、
  3002 FailData 状态如实补展
【四端浏览器（CXV · Task 8）】
- 四端 + index 五处挂载 #/chainview JS 渲染后视觉（布局/间距/链卡边条色 = 链色语义：
  紫 ChainMaker / 蓝 Fabric / 青 FISCO BCOS / 绿 IRITA——icon+文字，绝不仅靠颜色）
- 节点情况：四链卡（高度/节点数/共识/mode 徽章/状态）+ 选中链节点表 source 列
  （rpc / static+probe / sim 如实展示）
- 块浏览：最近 20 块新→旧、行点击块抽屉（hash/time/tx_count/proposer/tx 列表）、tx 点击详情、
  irita「Merkle 证明可用」标注（real 模式实际出现）
- 链上数据追踪：message_type 五类 chip + 状态过滤、分页表、行点击 openCxDetail；直查表单
  （链选 + TxID）；固定小字「服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选」
  （本脚本已 grep 逐字）
- rg 暗色 .d-cxv-reg-hl outline +「⇄ 监管中继段」对比度；chip ☑/☐ 字形各主题可读性；
  index 端无 drone.css 的降级观感（内容完整、装饰缺席）
- 能力降级 2005「该链 RPC 不支持…」实弹触发（如 FISCO v3.16 块详情怪癖）= 真链验收窗
  （Task 14）——sim 四链全实现 BlockQuerier，2005 不可构造；本脚本仅断言可构造负路径
  （未知链 / height=0 / 越界 / 不存在 TxID → 6002）
【虫洞拓扑（WTOPO · Task 9）】
- au/netsec 拓扑页签 SVG 实render：position min-max 归一化布点、类型着色（紫 MANAGEMENT /
  蓝 EDGE / 青 UAV / 红 ATTACKER + ⚠ 标签）、虫洞边红虚线 d-wormhole-flow 流动动画 + 中点 ⚠、
  ISOLATED 红虚线描边 + ⛔ + d-pulse-hit 脉冲环、OFFLINE 空心、会话路径加粗（虫洞优先级最高）
- 「未布点」侧清单 DOM：无 position 节点不画不猜逐节点列出 +「涉及未布点/未知端点的边 N 条
  同步不画」如实计数（sim 数据面无法构造无-position 节点——本脚本已断言 API 6002 门；
  合成 fixture 下的侧清单目检归此项）
- 坐标红线口播（Task 9 校准措辞）：「抽象层全量可见（含攻击者），地理层按经纬度红线落点」——
  probe 分裂（有 position 无 lat/lon → ∈WTOPO ∧ ∉Leaflet）两层对照目检
- 三态联动实操：drill toggle/evaluate/switch 后切回拓扑页签双层重绘时序；hover tip（边/节点）
  排版与跟随；图例 9 项 + 红线小字窄屏换行
【验收故事全流程】
- 按 docs/demo-script.md 第 0-8 章完成约 30 分钟三标签页实演（附录 A 检查清单逐项勾选、
  附录 B 设计内拒绝现场复现、附录 C 时长核对），另加证照中心端签发/台账/查验/吊销四页实演
  （demo-script 四端版属 Task 15）——正式验收以人工实演为准，本脚本仅 API 层

════════════════ 验证汇总 ════════════════
PASS=259  FAIL=0
ALL_GREEN —— 四端验收故事 API 层断言全部通过（浏览器目检见上方 DEFERRED-HUMAN 清单）
```

---

## Run 2 稳定性复核附记

- 同口径复跑（`BACK_PORT=18180 FRONT_PORT=18190`）：**PASS=259 FAIL=0 ALL_GREEN**，退出码 0。
- 与 Run 1 逐行 diff（归一动态值后）仅 3 处差异：RNS 主体号（每场随机）、IRITA- 源链 TxID 哈希 ×2 处引用（sim txID = SM3(内容+时变因子)）——**全部确定性断言两轮逐字复现**（含 chainmaker 块高 35、四段 TxID 前缀、3002/6002 负路径码）。
- 清场复核（两轮各自）：`ss -tln` 确认 :18180/:18190 已释放；`/tmp/skytrust-verify-*` 已删；无残留 skytrust-sim/serve-frontend 子进程；生产 :8080 与 :15001 测后仍在监听（未触碰）；:18080 外来服务未动。

## DEFERRED-HUMAN（人工目检清单——本轮四端化后共 9 组）

脚本尾部原样打印（见上方全量输出末段）：【四端通用】【运营商端】【管理当局端】【监管当局端】+ 新增三组 **【证照中心端 license-center.html】【四端浏览器（CXV · Task 8）】【虫洞拓扑（WTOPO · Task 9）】** +【验收故事全流程】。其中与本轮裁决直接相关者：

1. **2005 能力降级实弹**（「该链 RPC 不支持…」如 FISCO v3.16 块详情怪癖、irita real 模式 Merkle 标注）= 真链验收窗（Task 14）——sim 不可构造，本脚本仅断言可构造负路径（6002 ×4）。
2. **「未布点」侧清单 DOM**——sim 数据面无法构造无-position 节点（API 6002 门已断言），合成 fixture 下的侧清单目检归【虫洞拓扑】组。
3. **ct 跨链失败黄条 / GENERATING 重试实路径**——sim 跨链恒成功无法自然构造，真链验收时目检（沿 Task 7 报告既有裁决）。
4. **au/passes 降级只读**（Task 10）后的通告条/入口链接视觉——沿 Task 10 报告既有裁决。
5. demo-script 四端版实演脚本属 Task 15——本脚本第 0-8 章仍按现行三端版 demo-script 剧情固定值，第 3b 章 PASS-2026-002 为脚本本地值（Task 15 收编速查表后两处同步）。

## 红线遵守声明

- 生产 :8080（real 后端）/:15001（前端代理）全程零接触——脚本硬编码拒绝 :8080/:8090 的自检逻辑原样保留；`demo/reset` 仅作用于脚本自起的隔离 sim。
- :18080 外来服务未杀未碰（换口 18180/18190 即为此）。
- 冻结资产零改动、生成物（endpoints.js/apifox）零改动、本任务无后端改动（git diff --stat = 本脚本 + 本报告两文件）。
