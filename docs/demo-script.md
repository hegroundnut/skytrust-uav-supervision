# 验收演示脚本 ·《紧急医疗运输：一次跨域飞行的全程可信监管》

> 本脚本是验收当日的**操作手册 + 解说词**。界面本身是通用产品 UI（无任何剧情文案），
> 故事只存在于本脚本。操作者按章推进，每章 = 台词要点 → 精确操作 → 预期证据。
> 预计总时长 25–30 分钟（附录 C）。排练可用参考流程页的「一键实跑」，正式验收**全程手动**。

## 角色与固定值速查

| 项 | 值 |
|---|---|
| 医疗运营商 | `OP-MED-01` / 云翼医疗空运 |
| 医疗制造商 | `MF-MED-01` / 擎天航空制造 |
| 医疗无人机 | `UAV-MED-01`（序列号 `SN-MED-0001`，型号 `MTOL-Care-200`） |
| 医疗走廊航段 | `R-MED-01`（Zone-M，市一医院H → 血液中心B，120–300m） |
| 任务 | 类型 `MEDICAL`，载荷 `SPECIAL_BLOOD`，时窗 **当日 18:00–20:00** |
| 冲突方（种子数据） | 运营商 `Operator-B` + 无人机 `UAV-B-001`，任务时窗 18:30–19:30、同走廊、高度 150–260m |
| 管理方 | 审核员 `Manager-A`；许可 `PASS-MED-01`（17:30–21:00） |
| 安全运营 | 操作人 `SecOps`；医疗机链下节点 `UAV-MED-01-NODE`（UAV 型，坐标 0,0，邻居 `N1`） |
| 监管方 | `Regulator-A`（申请/追踪/核验）、`Regulator-B`（审批）；告警 `ALERT-MED-01`；授权 `AUTH-MED-01` |

---

## 第 0 章 · 开场：三条链与一个平台（平台总览，约 2 分钟）

**台词要点**：SkyTrust 用三条链各司其职——ChainMaker 监管链是不可绕过的枢纽，Fabric 承载运营，
FISCO BCOS 承载行业管理。任何跨域动作都必须经监管链签收、中继、双端存证。

**操作**（`#/overview`）：
1. 打开平台 → 默认落地「平台总览」：指三链状态条（全部 ONLINE）与核心指标卡。
2. 演示维护区 →「复位演示数据 demo/reset」（确认弹窗）→「灌注演示数据 demo/init」。
   **台词**：复位只清本地业务库与模拟链状态——真实链上的历史账本永不受影响，这本身就是监管设计的一部分。

**预期证据**：reset 回显 `tables_cleared`；init 回显 created/skipped 计数（厂商 3、运营商 3、无人机 7、航段 5、节点 8）。

## 第 1 章 · 建档：医疗空运公司接入平台（运营商工作台，约 4 分钟）

**台词要点**：一家医疗空运公司要上平台飞，先得有身份——公司、制造商、走廊航段、飞机，
每一样都要建档，而飞机注册的那一刻，三条链上就同时留下了它的出生证明。

**操作**（`#/wb-operator`）：
1. 主数据 tab：注册制造商 `MF-MED-01`/擎天航空制造 → 注册运营商 `OP-MED-01`/云翼医疗空运
   （**指** 回显里的链上组织 chain_org_id）→ 创建航段 `R-MED-01`（Zone-M，市一医院H→血液中心B，120/300）。
2. 无人机管理 tab：注册 `UAV-MED-01`（SN-MED-0001 / MTOL-Care-200 / MF-MED-01 / OP-MED-01）。
   **指** 结果面板的四段跨链存证组件：①源链上链 → ②监管链签收 → ③监管链中继 → ④目标链存证，点开展示四个 TxID。
3. 状态机：`VERIFY` → VERIFIED，`ACTIVATE` → ACTIVE。

**预期证据**：UAV_REGISTER_PROOF 跨链单 status=SUCCESS、verify_result=PASS；chips 条出现 UAV/MANUFACTURER/OPERATOR/ROUTE/CROSS_TX。

## 第 2 章 · 申请：一单特殊血样任务（运营商工作台，约 2 分钟）

**台词要点**：医院有一袋 RH 阴性特殊血样要在两小时内送到血液中心。注意——任务描述从提交那一刻起
就是密文，接下来无论管理方还是台账，都只能看到脱敏值。

**操作**（`#/wb-operator?tab=missions`）：
1. 任务创建：OP-MED-01 / UAV-MED-01 / 类型 `MEDICAL` / 载荷 `SPECIAL_BLOOD` /
   描述「紧急运输特殊血样（RH 阴性），全程专用冷链箱，医院到科室直达，18 时前必须起飞」/
   航段勾选 `R-MED-01` / 高度 120–300 / 时窗当日 18:00–20:00。
   **指** 回显的 masked_value（脱敏）与 SM3 摘要——明文只在第 8 章授权开箱后重现。
2. 任务提交（提交人 OP-MED-01）→ **指** application_id 与 MISSION_APPLICATION 四段存证。

**预期证据**：任务状态 SUBMITTED；chips 出现 MISSION/APPLICATION。

## 第 3 章 · 冲突：物流航班抢了同一条走廊（运营商工作台，约 3 分钟）

**台词要点**：同一时段，物流公司的常规补给任务也要过 Zone-M——时间、航路、高度三维重叠，
平台在审核之前就把冲突拦了出来。协调是有痕迹的，而且同一冲突不会被「协调」两次。

**操作**：
1. 同 tab 再创建任务：`Operator-B` / `UAV-B-001` / 类型 `LOGISTICS` / 载荷 `CARGO` /
   描述「常规物资补给」/ 航段 `R-MED-01` / 高度 150–260 / 时窗 18:30–19:30 → 提交（提交人 Operator-B）。
2. 冲突检测：对**医疗任务号**执行「检测冲突」→ **指** 命中卡：conflict_id、类型（TIME/ROUTE/ALTITUDE）、任务 A×B、协调建议。
3. 冲突消解：resolution 填「医疗任务优先，物流航班顺延至 20:00 后执行」→ RESOLVED。
4. **设计内拒绝**：同 conflict_id 再次消解 → 红色错误卡 **3004**。
   **台词**：这不是 bug——重复消解被幂等拒绝，说明协调记录不可被篡改或重放。

**预期证据**：医疗任务状态从 COORDINATING 恢复推进；3004 错误卡带词典解说。

## 第 4 章 · 审核与许可：管理方只看得见该看的（管理方审核台，约 3 分钟）

**台词要点**：换到管理方视角。注意两点：一，待审队列是从**跨链台账**里长出来的——换台电脑、
清了缓存都照样在；二，审核员全程只见脱敏值，「血样」两个字他看不到。

**操作**（`#/wb-manager`）：
1. 待审队列 tab：**指** 面板 A（MISSION_APPLICATION 台账，business_id=申请号，审核状态列 PENDING）
   与面板 B（SUBMITTED 任务面板）。可现场 `STORE.clear()` + 刷新证明队列不依赖本地缓存。
2. 面板 B 点「详情」→ **指** 隐私说明与 masked_value。
3. 面板 A 点「审核」→ 裁决 APPROVED / 审核员 Manager-A / 规则 `ZONE_LIMIT,MANUAL` /
   意见「医疗紧急任务，走廊时段已协调」→ 提交（确认弹窗）→ **指** MISSION_REVIEW_RESULT 回传存证。
4. 许可管理 tab：签发 `PASS-MED-01`（任务号用 chips、签发人 Manager-A、17:30–21:00）→ **指** FLIGHT_PASS 存证；验证 → valid=true。

**预期证据**：任务状态 APPROVED；面板 A 状态列变 REVIEWED；许可 VALID。

## 第 5 章 · 起飞：链下可信通道（链网安全运营中心，约 3 分钟）

**台词要点**：飞机起飞后，秒级上链不现实——位置、心跳走的是链下可信网络：亚秒级时延，
但每一跳都有 SM9 身份、每条消息都有 SM3 存证。跨链管「信任」，链下管「实时」。

**操作**（`#/wb-security`）：
1. 网络拓扑 tab：**指** 8 节点种子拓扑与 MGR 管理节点。注册节点 `UAV-MED-01-NODE`
   （UAV / 坐标 0,0 / 邻居 `N1`）→ 拓扑刷新出现医疗机接入点（**台词**：图为无向，单边声明即双向连通）。
2. 会话监控 tab：建立会话 uav_id=`UAV-MED-01`、任务号/许可号用 chips → **指** SM9 挑战认证 ✓、nonce、初始路径 `UAV-MED-01-NODE → N1 → … → MGR`。
3. 消息流量 tab：发 3 条 `POSITION_UPDATE` + 1 条 `HEARTBEAT` → **指** 逐跳时延条与 stats 统计卡（亚秒级、成功率 100%）。

**预期证据**：会话 INIT/ACTIVE；消息 SUCCESS；p95 时延毫秒级。

## 第 6 章 · 虫洞攻防：网络里出现了一条不该存在的捷径（安全运营中心，约 4 分钟）

**台词要点**：攻击者在网络两侧挖了一条「虫洞隧道」——消息被诱进去，时延低得不合常理。
平台不靠防火墙 signatures，靠**物理一致性**：邻接关系、时延合理性等五个维度给会话打分。

**操作**（`#/wb-security?tab=drill`）：
1. 开启虫洞（确认弹窗）→ 拓扑 tab 刷新：**指** NODE-X⇄NODE-Y 红虚线隧道边。
2. 会话监控：**新建**会话（uav_id=UAV-MED-01）→ **指** 初始路径已含隧道边（攻击先于会话存在）。
3. 消息流量：对新会话发 `POSITION_UPDATE` → **指** 时延骤降（被诱入隧道）。
4. 攻防演练：风险评估（新会话）→ **指** ⚠ DETECT 大红判定、5 维分数条（邻接/时延维度越过阈值标线变红）、联动安全事件。
5. 路径规避切换 → **指** 原路径 vs 新路径、恢复时延、会话 RECOVERED；事件台账出现 DETECT/ISOLATE/RECOVER 全程留痕（点行看 5 维评分 JSON）。
6. **设计内拒绝**：再开虫洞 → **4001**。**台词**：X/Y 已被隔离，隔离是处置不是状态位——只有平台复位才能解除，攻击者无法「洗白」自己。

**预期证据**：verdict=DETECT；切换后 verdict 复评=PASS（可选加分项）；4001 错误卡带解说。

## 第 7 章 · 告警与追踪：从一个伪名追到真身（监管门户，约 3 分钟）

**台词要点**：安全事件同步给了监管方。监管台账里无人机只有**伪名**——但七级追踪可以依法
从伪名一路解析回注册身份，每一级都标注数据来自哪条链。

**操作**（`#/wb-regulator`）：
1. 告警管理 tab：登记 `ALERT-MED-01`（WORMHOLE_ALERT / HIGH / SYSTEM2 / 任务号用 chips / 伪名 `PS-MED-01`）→ **指** evidence_hash（匿名化：明文身份不出库）。
2. 身份追踪 tab：入口=告警号 `ALERT-MED-01` → **指** 七级时间线逐级 RESOLVED、「✓ 全链可溯」、每级的 source（CHAINMAKER_INDEX/FABRIC_DETAIL/FISCO_BCOS_DETAIL）与耗时。
3. 换入口=伪名再追一次 → 同样全通（**台词**：三入口任一即可起追）。
4. 状态机推进：IDENTIFIED → TRACED → REVIEWED → RESOLVED，每步填处置说明。
5. **设计内拒绝（可选加分项）**：对新告警直接跳 RESOLVED → **6002** 线性状态机拒绝。

**预期证据**：break_level=0；告警台账五维过滤 event_type=WORMHOLE_ALERT 可复现。

## 第 8 章 · 授权与开箱：监管者也不能随便看（监管门户，约 4 分钟）

**台词要点**：现在监管员想看任务明文。他不能直接看——必须先申请授权、由另一名监管员审批、
审批摘要上链，然后**在授权范围内**开箱。开箱那一刻的核验结论，又回到了链上。

**操作**（`#/wb-regulator?tab=authz` → `?tab=inspect`）：
1. 授权申请 `AUTH-MED-01`（Regulator-A / MISSION / 任务号用 chips / scope 勾 `ROUTE`+`PAYLOAD` / 事由「虫洞告警调查，需核验航迹与载荷一致性」）→ **指** audit_hash 与有效窗。
2. 授权审批：Regulator-B / APPROVE（确认弹窗）→ **指** chain_tx_id 与 ChainMaker 链标签（审计摘要上链）。
3. 密文核验 tab：**authorization_id 留空**执行 → **5002** 封缄卡。**台词**：没有授权，监管者看到的也只有密文元信息——隐私保护对特权角色同样生效。
4. 填入 `AUTH-MED-01` 再执行，payload_type 填 `SPECIAL_BLOOD`、trajectory 填 `R-MED-01` → **指** 明文视图（description 重现「特殊血样」）、digest_match/signature_valid 双 ✓、conclusion ROUTE_OK + PAYLOAD_OK、chain_tx_id 与 reg_audit_id（开箱行为本身也被审计）。
5. 密码工具箱 tab：sm3 计算样例 payload → keygen → sign → verify valid=true；**把 payload 改一个字符再验 → valid=false**。**台词**：这就是全平台完整性的地基——篡改一个比特都会现形。

**预期证据**：5002 封缄视图含 masked_value/sm3_hash；开箱后 scope=[MISSION,ROUTE,PAYLOAD,IDENTITY]（4 项按后端回显）；篡改验签红卡。

## 第 9 章 · 收尾：许可收回，账本说话（监管门户 + 平台总览，约 2 分钟）

**台词要点**：任务完成，许可收回。最后我们不总结 PPT——直接看账本。

**操作**：
1. `#/wb-manager?tab=passes`：吊销 `PASS-MED-01`（原因「运输完成，许可回收」）→ **指** PASS_REVOKE 存证与 crosschain_status；验证 → **valid=false（设计内：吊销即刻全网生效）**。
2. `#/wb-regulator?tab=audit`：监管审计与全域审计两张台账 → 各导出一份 CSV（**台词**：审计可离线归档）。
3. `#/wb-regulator?tab=cockpit`：驾驶舱总览（告警 RESOLVED、攻防 DETECT/ISOLATE/RECOVER 计数、授权 AUTHORIZED）。
4. `#/overview`：跨链流水全量盘点——**指** 至少 5 类消息各一笔 SUCCESS：UAV_REGISTER_PROOF / MISSION_APPLICATION / MISSION_REVIEW_RESULT / FLIGHT_PASS / PASS_REVOKE，点开任意一笔看四段 TxID 收尾。

**结束语**：从建档到回收，每一次跨域动作都在三条链上留下了不可绕过的四段存证；
而所有「被拒绝」的瞬间，恰恰是系统在证明它在保护你。

---

## 附录 A · 验收前检查清单

- [ ] 链环境：sim 模式（`go run ./cmd/server`）或 real 模式（`./scripts/start-backend-real.sh`，三链容器已起、**绝不** `network.sh down`）
- [ ] 后端 :8080 健康（health/check 全绿）；前端代理 :8090（`./scripts/serve-frontend.sh`）
- [ ] 平台总览执行 demo/reset + demo/init，种子计数符合第 0 章预期
- [ ] 四工作台 + 总览各打开一遍无 JS 报错（控制台干净）
- [ ] 完整排练一遍本脚本（含全部设计内拒绝点），记录各章实际耗时
- [ ] 双屏/投屏分辨率下侧边栏与表格无横向溢出

## 附录 B · 设计内拒绝汇总表（「拒绝即保护」台词卡）

| 章 | 触发操作 | 预期拒绝 | 一句话台词 |
|---|---|---|---|
| 3 | 同一冲突重复消解 | code=3004 | 协调记录不可重放——消解只有一次 |
| 6 | 隔离残留后重开虫洞 | code=4001 | 隔离是处置不是开关，攻击者无法自我洗白 |
| 6(可选) | 健康会话切路径 | code=4002 | 没降级就不切换——恢复机制不被滥用 |
| 7(可选) | 告警跨级推进 | code=6002 | 状态机线性推进，监管流程不可跳跃 |
| 8 | 未授权密文开箱 | code=5002+封缄 | 监管者无授权同样只见密文——隐私对特权生效 |
| 8 | 篡改 payload 验签 | valid=false | 篡改一个比特都会现形 |
| 9 | 吊销后复验许可 | valid=false | 吊销即刻全网生效，不存在「旧证还能飞」 |

## 附录 C · 预计时长（合计约 27 分钟）

| 章 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| 分钟 | 2 | 4 | 2 | 3 | 3 | 3 | 4 | 3 | 4 | 2 |
