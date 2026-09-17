// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// ============================================================================
// uav_management —— FISCO BCOS 管理方业务链合约（SkyTrust 无人机跨域可信监管）
//
// 角色：13 步跨链协议的「管理链」。
//   - TARGET：任务申请（MISSION_APPLICATION）的最终目标链——gateway.go:330 经
//     targetContractMethod(policy.go:82-83) 调用 SubmitApplication。
//   - SOURCE：当 SourceChain == "fisco-bcos" 时（MISSION_REVIEW_RESULT / FLIGHT_PASS /
//     PASS_REVOKE，routingTable policy.go:14-17），sourceContract(policy.go:99-100)
//     返回本合约，网关在 gateway.go:214 调 CrosschainSubmit、gateway.go:365 调
//     CrosschainAck。
//
// 方法名 / 参数名与后端 SubmitTx 调用点逐字对应（强制规则 P6-R9）。后端固化常量
// ContractFiscoManage = "uav_management"（policy.go:70）。本合约后端调用面为下列
// 3 个写方法（存证映射均为 private，无自动 getter）；部署期按
// docs/real-chain-migration.md §5-② 另补充只读方法 QueryState(key)（与 Fabric 链码 /
// ChainMaker 合约同例：真实传输 QueryState 经 CallContract("QueryState", key) 调用，
// 键形态 APP/<mission_id>、SUBMIT/<cross_tx_id>、ACK/<cross_tx_id>，不在后端 6 个
// 写方法调用面内，当前后端无活跃业务调用点，供部署期/运维状态核验）。
//
//   1) SubmitApplication(mission_id, application_id, operator_id, uav_id,
//                        mission_type, start_time, end_time, route_segments, sm3_hash)
//      —— 键集 = requiredFields[MISSION_APPLICATION]（policy.go:45），主键 mission_id。
//   2) CrosschainSubmit(cross_tx_id, message_type, business_id)
//      —— 键集见 gateway.go:215，主键 cross_tx_id。
//   3) CrosschainAck(cross_tx_id, reg_record_id, target_chain_tx_id, status)
//      —— 键集见 gateway.go:366-367，主键 cross_tx_id。
//
// FISCO BCOS v3 对齐：合约形态按 FISCO BCOS v3.x（Solidity ^0.8）编写。
//   ⚠ 当前仓库子模块版本不匹配——node v2.7.0 / Console v3.8.0 / go-sdk v3.0.2，
//     必须按迁移指南统一至 v3.x 后方可编译部署：docs/real-chain-migration.md §2
//     （Task 21 交付，前向指针）。v2.x 节点与 v3.x Console/SDK 不配套，版本未统一
//     前本合约不可部署。
//
// 参数序列化约定（迁移期传输适配）：后端 SubmitTx 的 params 为 map[string]any。
//   复杂/列表值（route_segments）与时间戳类值（start_time / end_time）在 real 传输
//   实现时统一序列化为字符串后，按本合约的 string memory 形参逐位传入（与 Fabric
//   recordJSON 约定一致，见 contracts/fabric/README.md 与 docs/real-chain-migration.md §5）。
//
// 状态：部署期校验（Console 编译部署——见 contracts/README.md 与 docs/real-chain-migration.md §3-§4）。
//   hermetic 环境无 solc / FISCO 工具链，不编译本文件；结构自查（SPDX / pragma /
//   contract / mapping / 3 event / 3 完整方法 / require 校验 / 无桩内容）代替编译门，
//   记录于 Task 19 报告。
// ============================================================================

contract UavManagement {
    // 存证映射 mapping(string => string)：主键 → 序列化存证记录。三类证据各用独立
    // 映射，避免 CrosschainSubmit 与 CrosschainAck 同以 cross_tx_id 为主键时相互覆盖
    // （对应 Fabric 链码 SUBMIT/ 与 ACK/ 前缀语义）。private → 不生成自动 getter，
    // 对外表面保持恰为 3 个写方法。
    mapping(string => string) private applications; // mission_id  → SubmitApplication 记录
    mapping(string => string) private submits;      // cross_tx_id → CrosschainSubmit 记录
    mapping(string => string) private acks;         // cross_tx_id → CrosschainAck 记录

    // 事件（事件名 = 方法名大写），留痕每次写存证；主键 indexed 便于部署期按主键检索。
    event SUBMITAPPLICATION(
        string indexed mission_id,
        string application_id,
        string operator_id,
        string uav_id,
        string mission_type,
        string start_time,
        string end_time,
        string route_segments,
        string sm3_hash
    );

    event CROSSCHAINSUBMIT(
        string indexed cross_tx_id,
        string message_type,
        string business_id
    );

    event CROSSCHAINACK(
        string indexed cross_tx_id,
        string reg_record_id,
        string target_chain_tx_id,
        string status
    );

    // ------------------------------------------------------------------------
    // SubmitApplication —— 任务申请落管理链（13 步第 10 步 TARGET）。
    // 调用点 gateway.go:330（经 targetContractMethod policy.go:82-83）；params =
    // req.Payload 透传，必备键转录自 requiredFields[MISSION_APPLICATION] policy.go:45。
    // 网关 CheckPayload(policy.go:52-64) 已强制各键非空，此处链上逐键再次校验。
    // 主键 mission_id，存证 applications[mission_id]，事件 SUBMITAPPLICATION。
    // ------------------------------------------------------------------------
    function SubmitApplication(
        string memory mission_id,
        string memory application_id,
        string memory operator_id,
        string memory uav_id,
        string memory mission_type,
        string memory start_time,
        string memory end_time,
        string memory route_segments,
        string memory sm3_hash
    ) public {
        require(bytes(mission_id).length > 0, "mission_id required");
        require(bytes(application_id).length > 0, "application_id required");
        require(bytes(operator_id).length > 0, "operator_id required");
        require(bytes(uav_id).length > 0, "uav_id required");
        require(bytes(mission_type).length > 0, "mission_type required");
        require(bytes(start_time).length > 0, "start_time required");
        require(bytes(end_time).length > 0, "end_time required");
        require(bytes(route_segments).length > 0, "route_segments required");
        require(bytes(sm3_hash).length > 0, "sm3_hash required");

        string[] memory keys = new string[](9);
        keys[0] = "mission_id";
        keys[1] = "application_id";
        keys[2] = "operator_id";
        keys[3] = "uav_id";
        keys[4] = "mission_type";
        keys[5] = "start_time";
        keys[6] = "end_time";
        keys[7] = "route_segments";
        keys[8] = "sm3_hash";

        string[] memory vals = new string[](9);
        vals[0] = mission_id;
        vals[1] = application_id;
        vals[2] = operator_id;
        vals[3] = uav_id;
        vals[4] = mission_type;
        vals[5] = start_time;
        vals[6] = end_time;
        vals[7] = route_segments;
        vals[8] = sm3_hash;

        applications[mission_id] = _encode(keys, vals);

        emit SUBMITAPPLICATION(
            mission_id,
            application_id,
            operator_id,
            uav_id,
            mission_type,
            start_time,
            end_time,
            route_segments,
            sm3_hash
        );
    }

    // ------------------------------------------------------------------------
    // CrosschainSubmit —— 源链代提交存证（13 步第 3 步，请求无 source_chain_tx_id 时）。
    // 调用点 gateway.go:214；方法名固化于 SourceSubmitMethod policy.go:74；合约经
    // sourceContract("fisco-bcos") policy.go:99-100 = ContractFiscoManage policy.go:70。
    // params 键：cross_tx_id、message_type、business_id（gateway.go:215）。
    // 主键 cross_tx_id，存证 submits[cross_tx_id]，事件 CROSSCHAINSUBMIT。
    // ------------------------------------------------------------------------
    function CrosschainSubmit(
        string memory cross_tx_id,
        string memory message_type,
        string memory business_id
    ) public {
        require(bytes(cross_tx_id).length > 0, "cross_tx_id required");
        require(bytes(message_type).length > 0, "message_type required");
        require(bytes(business_id).length > 0, "business_id required");

        string[] memory keys = new string[](3);
        keys[0] = "cross_tx_id";
        keys[1] = "message_type";
        keys[2] = "business_id";

        string[] memory vals = new string[](3);
        vals[0] = cross_tx_id;
        vals[1] = message_type;
        vals[2] = business_id;

        submits[cross_tx_id] = _encode(keys, vals);

        emit CROSSCHAINSUBMIT(cross_tx_id, message_type, business_id);
    }

    // ------------------------------------------------------------------------
    // CrosschainAck —— 源链统一回执确认（13 步第 12 步，目标链确认后回写源链）。
    // 调用点 gateway.go:365；合约经 sourceContract("fisco-bcos") policy.go:99-100。
    // params 键：cross_tx_id、reg_record_id、target_chain_tx_id、status（gateway.go:366-367）。
    // 主键 cross_tx_id，存证 acks[cross_tx_id]，事件 CROSSCHAINACK。
    // ------------------------------------------------------------------------
    function CrosschainAck(
        string memory cross_tx_id,
        string memory reg_record_id,
        string memory target_chain_tx_id,
        string memory status
    ) public {
        require(bytes(cross_tx_id).length > 0, "cross_tx_id required");
        require(bytes(reg_record_id).length > 0, "reg_record_id required");
        require(bytes(target_chain_tx_id).length > 0, "target_chain_tx_id required");
        require(bytes(status).length > 0, "status required");

        string[] memory keys = new string[](4);
        keys[0] = "cross_tx_id";
        keys[1] = "reg_record_id";
        keys[2] = "target_chain_tx_id";
        keys[3] = "status";

        string[] memory vals = new string[](4);
        vals[0] = cross_tx_id;
        vals[1] = reg_record_id;
        vals[2] = target_chain_tx_id;
        vals[3] = status;

        acks[cross_tx_id] = _encode(keys, vals);

        emit CROSSCHAINACK(cross_tx_id, reg_record_id, target_chain_tx_id, status);
    }

    // ------------------------------------------------------------------------
    // QueryState —— 通用状态键读取（部署期补充的只读方法，docs/real-chain-migration.md
    // §5-②，与 Fabric 链码 QueryState / ChainMaker 合约 queryState 同例）。真实传输
    // QueryState(contract, key) 经 CallContract("QueryState", key) 调用；键形态与写入
    // 存证的前缀语义一一对应：APP/<mission_id> → applications、SUBMIT/<cross_tx_id> →
    // submits、ACK/<cross_tx_id> → acks（对应 Fabric 链码状态键 APP/、SUBMIT/、ACK/）。
    // 无值 revert（与 ChainMaker queryState 的 "state not found" 语义一致）。
    // 预留（后端当前无活跃 QueryState 调用点）。
    // ------------------------------------------------------------------------
    function QueryState(string memory key) public view returns (string memory) {
        require(bytes(key).length > 0, "key required");
        string memory v;
        if (_hasPrefix(key, "APP/")) {
            v = applications[_substring(key, 4)];
        } else if (_hasPrefix(key, "SUBMIT/")) {
            v = submits[_substring(key, 7)];
        } else if (_hasPrefix(key, "ACK/")) {
            v = acks[_substring(key, 4)];
        } else {
            revert("unknown key prefix");
        }
        require(bytes(v).length > 0, "state not found");
        return v;
    }

    // _hasPrefix / _substring —— QueryState 的键前缀解析辅助（纯内存操作）。
    function _hasPrefix(string memory s, string memory p)
        internal
        pure
        returns (bool)
    {
        bytes memory sb = bytes(s);
        bytes memory pb = bytes(p);
        if (sb.length < pb.length) {
            return false;
        }
        for (uint256 i = 0; i < pb.length; i++) {
            if (sb[i] != pb[i]) {
                return false;
            }
        }
        return true;
    }

    function _substring(string memory s, uint256 start)
        internal
        pure
        returns (string memory)
    {
        bytes memory sb = bytes(s);
        require(sb.length >= start, "substring out of range");
        bytes memory out = new bytes(sb.length - start);
        for (uint256 i = start; i < sb.length; i++) {
            out[i - start] = sb[i];
        }
        return string(out);
    }

    // ------------------------------------------------------------------------
    // _encode —— 按固定键序将 (keys, vals) 组装为 JSON-ish 存证字符串：
    //   {"k0":"v0","k1":"v1"}（键序与上表 params 键一致，长度随方法而定）。值由传输层
    //   序列化为 JSON-safe 字符串（ID / 十六进制
    //   SM3 摘要 / 序列化后的 route_segments），故不做额外转义。键名即上表逐字 params
    //   键，使存证记录自描述、便于部署期核验。完整实现，无桩内容。
    // ------------------------------------------------------------------------
    function _encode(string[] memory keys, string[] memory vals)
        internal
        pure
        returns (string memory)
    {
        require(keys.length == vals.length, "encode length mismatch");
        string memory out = "{";
        for (uint256 i = 0; i < keys.length; i++) {
            if (i > 0) {
                out = string(abi.encodePacked(out, ","));
            }
            out = string(abi.encodePacked(out, '"', keys[i], '":"', vals[i], '"'));
        }
        out = string(abi.encodePacked(out, "}"));
        return out;
    }
}
