// 由 docs/apifox/skytrust-backend.openapi.json 生成（73 端点全量，含录制样例）。
// 请勿手改：重新生成命令 ./scripts/gen-endpoints.sh。
window.ENDPOINTS = [
 {
  "path": "/api/chain/status",
  "tag": "基础",
  "summary": "三链状态（fabric/chainmaker/fisco-bcos 全 ONLINE）",
  "operationId": "chainStatus",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE"
    },
    "count": 3
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.163",
   "trace_id": "TRACE-20261006-daa76a"
  },
  "err": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE"
    },
    "count": 3
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.339",
   "trace_id": "TRACE-20261006-112bdd"
  }
 },
 {
  "path": "/api/health/check",
  "tag": "基础",
  "summary": "健康自检（DB/密码服务/链适配器）",
  "operationId": "healthCheck",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE"
    },
    "database": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.163",
   "trace_id": "TRACE-20261006-aa7779"
  },
  "err": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE"
    },
    "database": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.338",
   "trace_id": "TRACE-20261006-de678a"
  }
 },
 {
  "path": "/api/health/ping",
  "tag": "基础",
  "summary": "探活（恒 0）",
  "operationId": "healthPing",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.162",
   "trace_id": "TRACE-20261006-1c3a28"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.338",
   "trace_id": "TRACE-20261006-780054"
  }
 },
 {
  "path": "/api/crypto/sm3",
  "tag": "密码学",
  "summary": "SM3 规范化摘要",
  "operationId": "cryptoSm3",
  "req": {
   "payload": {
    "altitude_max": 120,
    "mission_id": "MISSION-2026-001",
    "operator_id": "Operator-A"
   }
  },
  "resp": {
   "code": 0,
   "data": {
    "canonical": "{\"altitude_max\":120,\"mission_id\":\"MISSION-2026-001\",\"operator_id\":\"Operator-A\"}",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.163",
   "trace_id": "TRACE-20261006-112c0a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-10-06 14:34:00.339",
   "trace_id": "TRACE-20261006-4092c2"
  }
 },
 {
  "path": "/api/crypto/sm9/keygen",
  "tag": "密码学",
  "summary": "SM9 身份密钥生成",
  "operationId": "cryptoSm9Keygen",
  "req": {
   "entity_id": "UAV-A-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "sm9_identity": "SM9-ID-UAV-A-001"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.163",
   "trace_id": "TRACE-20261006-7e30ed"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-10-06 14:34:00.339",
   "trace_id": "TRACE-20261006-6b8559"
  }
 },
 {
  "path": "/api/crypto/sm9/sign",
  "tag": "密码学",
  "summary": "SM9 签名（先 SM3 摘要再签）",
  "operationId": "cryptoSm9Sign",
  "req": {
   "payload": {
    "altitude_max": 120,
    "mission_id": "MISSION-2026-001",
    "operator_id": "Operator-A"
   },
   "sm9_identity": "SM9-ID-UAV-A-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "signature": "MGYEIIXdE9GbzVb9TmJvZSn0CLyoE424bt4evPTiMgM594ENA0IABHUR/A/IHwcpDMdfC/m6z9kw05ZMpK0/N1RCB1nO+chKlFJjrGXtnmqdu2sndy85pREJL9+L+qVQpJJLw/FmWrE=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.164",
   "trace_id": "TRACE-20261006-c5cce6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-10-06 14:34:00.339",
   "trace_id": "TRACE-20261006-b8c0ca"
  }
 },
 {
  "path": "/api/crypto/sm9/verify",
  "tag": "密码学",
  "summary": "SM9 验签。样例为确定性错误（畸形签名→1002）；成功路径见场景 TC1-03/TC1-04",
  "operationId": "cryptoSm9Verify",
  "req": {
   "payload": {
    "altitude_max": 120,
    "mission_id": "MISSION-2026-001",
    "operator_id": "Operator-A"
   },
   "signature": "!!!not-base64!!!",
   "sm9_identity": "SM9-ID-UAV-A-001"
  },
  "resp": {
   "code": 1002,
   "data": null,
   "message": "签名格式非法: illegal base64 data at input byte 0",
   "timestamp": "2026-10-06 14:34:00.165",
   "trace_id": "TRACE-20261006-9395c9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-10-06 14:34:00.339",
   "trace_id": "TRACE-20261006-fae3b4"
  }
 },
 {
  "path": "/api/demo/init",
  "tag": "演示",
  "summary": "演示数据灌注（幂等 upsert）",
  "operationId": "demoInit",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "created": {},
    "skipped": {
     "audit_log": 1,
     "identity_mapping": 1,
     "manufacturer": 3,
     "network_node": 8,
     "operator": 3,
     "route_segment": 5,
     "uav": 7
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.167",
   "trace_id": "TRACE-20261006-e70268"
  },
  "err": {
   "code": 0,
   "data": {
    "created": {
     "audit_log": 1,
     "identity_mapping": 1,
     "manufacturer": 3,
     "network_node": 8,
     "operator": 3,
     "route_segment": 5,
     "uav": 7
    },
    "skipped": {}
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.344",
   "trace_id": "TRACE-20261006-f41f9a"
  }
 },
 {
  "path": "/api/demo/reset",
  "tag": "演示",
  "summary": "清空全部业务表 + 模拟链状态复位（不重灌种子，重灌用 demo/init）",
  "operationId": "demoReset",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-06 14:34:00.338",
    "started_at": "2026-10-06 14:34:00.337",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.338",
   "trace_id": "TRACE-20261006-c9049a"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-06 14:34:00.367",
    "started_at": "2026-10-06 14:34:00.367",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.368",
   "trace_id": "TRACE-20261006-498708"
  }
 },
 {
  "path": "/api/manufacturer/list",
  "tag": "主数据",
  "summary": "制造商列表（分页）",
  "operationId": "manufacturerList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "adapter_type": "DJI-ADAPTER",
      "created_at": "2026-10-06 14:34:00.153",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.153"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-10-06 14:34:00.153",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.153"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-10-06 14:34:00.153",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.153"
     },
     {
      "adapter_type": "",
      "created_at": "2026-10-06 14:34:00.168",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.168"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.170",
   "trace_id": "TRACE-20261006-8b78ca"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.345",
   "trace_id": "TRACE-20261006-d2150b"
  }
 },
 {
  "path": "/api/manufacturer/register",
  "tag": "主数据",
  "summary": "制造商注册",
  "operationId": "manufacturerRegister",
  "req": {
   "manufacturer_id": "Manufacturer-DOC",
   "name": "文档样例制造商"
  },
  "resp": {
   "code": 0,
   "data": {
    "adapter_type": "",
    "created_at": "2026-10-06 14:34:00.168",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-10-06 14:34:00.168"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.169",
   "trace_id": "TRACE-20261006-5a2fb3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-10-06 14:34:00.345",
   "trace_id": "TRACE-20261006-6cc987"
  }
 },
 {
  "path": "/api/operator/list",
  "tag": "主数据",
  "summary": "运营商列表（分页）",
  "operationId": "operatorList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "chain_org_id": "org-operator-a",
      "contact": "ops-a@skytrust.demo",
      "created_at": "2026-10-06 14:34:00.153",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.153"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-10-06 14:34:00.153",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.153"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-10-06 14:34:00.154",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.154"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-10-06 14:34:00.171",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-06 14:34:00.171"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.172",
   "trace_id": "TRACE-20261006-8c92a5"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.345",
   "trace_id": "TRACE-20261006-1396a0"
  }
 },
 {
  "path": "/api/operator/register",
  "tag": "主数据",
  "summary": "运营商注册",
  "operationId": "operatorRegister",
  "req": {
   "name": "文档样例运营商",
   "operator_id": "Operator-DOC"
  },
  "resp": {
   "code": 0,
   "data": {
    "chain_org_id": "",
    "contact": "",
    "created_at": "2026-10-06 14:34:00.171",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-10-06 14:34:00.171"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.171",
   "trace_id": "TRACE-20261006-013489"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-10-06 14:34:00.345",
   "trace_id": "TRACE-20261006-e7ee44"
  }
 },
 {
  "path": "/api/route/create",
  "tag": "主数据",
  "summary": "航线段创建",
  "operationId": "routeCreate",
  "req": {
   "altitude_max": 150,
   "altitude_min": 50,
   "end_point": "E9",
   "route_id": "R901",
   "start_point": "S9",
   "zone": "Zone-D"
  },
  "resp": {
   "code": 0,
   "data": {
    "altitude_max": 150,
    "altitude_min": 50,
    "corridor_status": "OPEN",
    "created_at": "2026-10-06 14:34:00.173",
    "end_lat": 0,
    "end_lon": 0,
    "end_point": "E9",
    "route_id": "R901",
    "start_lat": 0,
    "start_lon": 0,
    "start_point": "S9",
    "zone": "Zone-D"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.173",
   "trace_id": "TRACE-20261006-87919e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-10-06 14:34:00.346",
   "trace_id": "TRACE-20261006-87078f"
  }
 },
 {
  "path": "/api/route/list",
  "tag": "主数据",
  "summary": "航线段列表（分页）",
  "operationId": "routeList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "altitude_max": 120,
      "altitude_min": 60,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.159",
      "end_lat": 30.54,
      "end_lon": 114.34,
      "end_point": "A-EXIT(30.540,114.340)",
      "route_id": "R101",
      "start_lat": 30.51,
      "start_lon": 114.31,
      "start_point": "A-ENTRY(30.510,114.310)",
      "zone": "Zone-A"
     },
     {
      "altitude_max": 120,
      "altitude_min": 80,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.160",
      "end_lat": 30.572,
      "end_lon": 114.372,
      "end_point": "B-GATE(30.572,114.372)",
      "route_id": "R205",
      "start_lat": 30.54,
      "start_lon": 114.34,
      "start_point": "A-EXIT(30.540,114.340)",
      "zone": "Zone-A"
     },
     {
      "altitude_max": 100,
      "altitude_min": 60,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.160",
      "end_lat": 30.59,
      "end_lon": 114.39,
      "end_point": "B-EAST(30.590,114.390)",
      "route_id": "R208",
      "start_lat": 30.57,
      "start_lon": 114.37,
      "start_point": "B-WEST(30.570,114.370)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 150,
      "altitude_min": 90,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.160",
      "end_lat": 30.6,
      "end_lon": 114.41,
      "end_point": "B-NORTH(30.600,114.410)",
      "route_id": "R209",
      "start_lat": 30.555,
      "start_lon": 114.365,
      "start_point": "B-GATE(30.555,114.365)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 120,
      "altitude_min": 60,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.160",
      "end_lat": 30.62,
      "end_lon": 114.42,
      "end_point": "B-LAND(30.620,114.420)",
      "route_id": "R306",
      "start_lat": 30.585,
      "start_lon": 114.385,
      "start_point": "B-EAST(30.585,114.385)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 150,
      "altitude_min": 50,
      "corridor_status": "OPEN",
      "created_at": "2026-10-06 14:34:00.173",
      "end_lat": 0,
      "end_lon": 0,
      "end_point": "E9",
      "route_id": "R901",
      "start_lat": 0,
      "start_lon": 0,
      "start_point": "S9",
      "zone": "Zone-D"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.174",
   "trace_id": "TRACE-20261006-b85619"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.346",
   "trace_id": "TRACE-20261006-f86a48"
  }
 },
 {
  "path": "/api/pilot/apply",
  "tag": "UOM登记",
  "summary": "操控员执照申请（即申即发；SM9 管理方签名；默认有效期+2年）",
  "operationId": "pilotApply",
  "req": {
   "category": "多旋翼",
   "id_number": "420100199001010011",
   "name": "文档样例操控员"
  },
  "resp": {
   "code": 0,
   "data": {
    "license": {
     "category": "多旋翼",
     "created_at": "2026-10-06 14:34:00.179",
     "expires_at": "2028-10-06 14:34:00.178",
     "id_number": "420100199001010011",
     "issued_at": "2026-10-06 14:34:00.178",
     "license_id": "PIL-6754c4bd66f4",
     "license_no": "UAV-PILOT-2026-7145",
     "name": "文档样例操控员",
     "signature": "MGYEICGvaBE2uQwO57/wL2k9NmLYI7B/JcsYhJ6ZFi1FLs+mA0IABA2Wvep5cgYH+uWqdZopUk3k8ktUTuDMsX1g7o1xtBkrWoE5X+kIKlW0YKzqad/HuYy94mb/Q2m1U61uyjHb45o=",
     "status": "ISSUED",
     "updated_at": "2026-10-06 14:34:00.179"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.179",
   "trace_id": "TRACE-20261006-e4c818"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotApplyReq",
   "timestamp": "2026-10-06 14:34:00.347",
   "trace_id": "TRACE-20261006-fc0670"
  }
 },
 {
  "path": "/api/pilot/list",
  "tag": "UOM登记",
  "summary": "执照分页列表（category 可选过滤）",
  "operationId": "pilotList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "category": "多旋翼",
      "created_at": "2026-10-06 14:34:00.179",
      "expires_at": "2028-10-06 14:34:00.178",
      "id_number": "420100199001010011",
      "issued_at": "2026-10-06 14:34:00.178",
      "license_id": "PIL-6754c4bd66f4",
      "license_no": "UAV-PILOT-2026-7145",
      "name": "文档样例操控员",
      "signature": "MGYEICGvaBE2uQwO57/wL2k9NmLYI7B/JcsYhJ6ZFi1FLs+mA0IABA2Wvep5cgYH+uWqdZopUk3k8ktUTuDMsX1g7o1xtBkrWoE5X+kIKlW0YKzqad/HuYy94mb/Q2m1U61uyjHb45o=",
      "status": "ISSUED",
      "updated_at": "2026-10-06 14:34:00.179"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.180",
   "trace_id": "TRACE-20261006-6883a4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.347",
   "trace_id": "TRACE-20261006-a89fb6"
  }
 },
 {
  "path": "/api/pilot/query",
  "tag": "UOM登记",
  "summary": "执照查询（不存在→7002）",
  "operationId": "pilotQuery",
  "req": {
   "license_id": "PIL-6754c4bd66f4"
  },
  "resp": {
   "code": 0,
   "data": {
    "category": "多旋翼",
    "created_at": "2026-10-06 14:34:00.179",
    "expires_at": "2028-10-06 14:34:00.178",
    "id_number": "420100199001010011",
    "issued_at": "2026-10-06 14:34:00.178",
    "license_id": "PIL-6754c4bd66f4",
    "license_no": "UAV-PILOT-2026-7145",
    "name": "文档样例操控员",
    "signature": "MGYEICGvaBE2uQwO57/wL2k9NmLYI7B/JcsYhJ6ZFi1FLs+mA0IABA2Wvep5cgYH+uWqdZopUk3k8ktUTuDMsX1g7o1xtBkrWoE5X+kIKlW0YKzqad/HuYy94mb/Q2m1U61uyjHb45o=",
    "status": "ISSUED",
    "updated_at": "2026-10-06 14:34:00.179"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.181",
   "trace_id": "TRACE-20261006-fbbd88"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotQueryReq",
   "timestamp": "2026-10-06 14:34:00.347",
   "trace_id": "TRACE-20261006-2e7590"
  }
 },
 {
  "path": "/api/realname/list",
  "tag": "UOM登记",
  "summary": "实名主体分页列表（subject_type 可选过滤）",
  "operationId": "realnameList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "contact": "027-88880001",
      "created_at": "2026-10-06 14:34:00.175",
      "id_number": "91420100DOCAIR01X",
      "name": "文档样例物流企业",
      "status": "REGISTERED",
      "subject_id": "RNS-ce23702e2f3e",
      "subject_type": "ENTERPRISE",
      "updated_at": "2026-10-06 14:34:00.175"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.177",
   "trace_id": "TRACE-20261006-54d7ca"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.346",
   "trace_id": "TRACE-20261006-038be9"
  }
 },
 {
  "path": "/api/realname/query",
  "tag": "UOM登记",
  "summary": "实名主体查询（不存在→7001）",
  "operationId": "realnameQuery",
  "req": {
   "subject_id": "RNS-ce23702e2f3e"
  },
  "resp": {
   "code": 0,
   "data": {
    "contact": "027-88880001",
    "created_at": "2026-10-06 14:34:00.175",
    "id_number": "91420100DOCAIR01X",
    "name": "文档样例物流企业",
    "status": "REGISTERED",
    "subject_id": "RNS-ce23702e2f3e",
    "subject_type": "ENTERPRISE",
    "updated_at": "2026-10-06 14:34:00.175"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.178",
   "trace_id": "TRACE-20261006-ea3d53"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameQueryReq",
   "timestamp": "2026-10-06 14:34:00.346",
   "trace_id": "TRACE-20261006-470cbf"
  }
 },
 {
  "path": "/api/realname/register",
  "tag": "UOM登记",
  "summary": "实名登记（个人/企业，模拟证件号；→REGISTERED）",
  "operationId": "realnameRegister",
  "req": {
   "contact": "027-88880001",
   "id_number": "91420100DOCAIR01X",
   "name": "文档样例物流企业",
   "subject_type": "ENTERPRISE"
  },
  "resp": {
   "code": 0,
   "data": {
    "subject": {
     "contact": "027-88880001",
     "created_at": "2026-10-06 14:34:00.175",
     "id_number": "91420100DOCAIR01X",
     "name": "文档样例物流企业",
     "status": "REGISTERED",
     "subject_id": "RNS-ce23702e2f3e",
     "subject_type": "ENTERPRISE",
     "updated_at": "2026-10-06 14:34:00.175"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.175",
   "trace_id": "TRACE-20261006-99117b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameRegisterReq",
   "timestamp": "2026-10-06 14:34:00.346",
   "trace_id": "TRACE-20261006-d7bf87"
  }
 },
 {
  "path": "/api/uav/list",
  "tag": "无人机",
  "summary": "无人机列表（分页）",
  "operationId": "uavList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-06 14:34:00.154",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260001",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-06 14:34:00.154"
     },
     {
      "created_at": "2026-10-06 14:34:00.154",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260002",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-10-06 14:34:00.154"
     },
     {
      "created_at": "2026-10-06 14:34:00.154",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260003",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-10-06 14:34:00.154"
     },
     {
      "created_at": "2026-10-06 14:34:00.155",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260004",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-10-06 14:34:00.155"
     },
     {
      "created_at": "2026-10-06 14:34:00.155",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260005",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-10-06 14:34:00.155"
     },
     {
      "created_at": "2026-10-06 14:34:00.155",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260006",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-10-06 14:34:00.155"
     },
     {
      "created_at": "2026-10-06 14:34:00.155",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260007",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-10-06 14:34:00.155"
     },
     {
      "created_at": "2026-10-06 14:34:00.182",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "realname_id": "RNS-ce23702e2f3e",
      "registration_mark": "UAS-96340857",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-10-06 14:34:00.190"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.193",
   "trace_id": "TRACE-20261006-dc69c4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.348",
   "trace_id": "TRACE-20261006-40f6e0"
  }
 },
 {
  "path": "/api/uav/query",
  "tag": "无人机",
  "summary": "无人机查询",
  "operationId": "uavQuery",
  "req": {
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-06 14:34:00.182",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-ce23702e2f3e",
    "registration_mark": "UAS-96340857",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-06 14:34:00.190"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.192",
   "trace_id": "TRACE-20261006-208db6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-10-06 14:34:00.347",
   "trace_id": "TRACE-20261006-41b93f"
  }
 },
 {
  "path": "/api/uav/register",
  "tag": "无人机",
  "summary": "无人机注册 + UAV_REGISTER_PROOF 跨链三链留痕（registration_mark 自动签发；可选关联实名主体；成功后自动建追踪映射）",
  "operationId": "uavRegister",
  "req": {
   "manufacturer_id": "Manufacturer-B",
   "model": "DJI-M350",
   "operator_id": "Operator-A",
   "realname_id": "RNS-ce23702e2f3e",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-10-06 14:34:00.184",
     "cross_tx_id": "CX-1ae5036a0851",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 5,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-5adb544241a36d9f7455aea4ec2fd9dc",
     "reg_record_id": "REGREC-b527fb494e6c",
     "reg_relay_tx_id": "CHAINMAKER-53c0e7a4af9603313f876569132a9d5b",
     "retry_of": "",
     "signature": "MGYEIDUnjtlqCMJ4e+0hjdcuHxYSxfyhTxm6hk+hGwAysFyAA0IABB33IUVIi9AcwwG0bk+sZseHADqb4feGdPtIndOUz8uBH6jMjPinB0Qf3bbEmoEGhzhek02E/wzef0TUMz2wN+4=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-04af80fd745a45ae7791eef4c4d6d0d0",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-10-06 14:34:00.190",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-10-06 14:34:00.182",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-ce23702e2f3e",
     "registration_mark": "UAS-96340857",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-06 14:34:00.190"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.191",
   "trace_id": "TRACE-20261006-851f78"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-10-06 14:34:00.347",
   "trace_id": "TRACE-20261006-1712ac"
  }
 },
 {
  "path": "/api/uav/revoke",
  "tag": "无人机",
  "summary": "无人机注销",
  "operationId": "uavRevoke",
  "req": {
   "operator": "Operator-A",
   "reason": "文档样例退役",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-06 14:34:00.182",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-ce23702e2f3e",
    "registration_mark": "UAS-96340857",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-06 14:34:00.195"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.195",
   "trace_id": "TRACE-20261006-9d47aa"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-10-06 14:34:00.349",
   "trace_id": "TRACE-20261006-0adb45"
  }
 },
 {
  "path": "/api/uav/status",
  "tag": "无人机",
  "summary": "无人机状态机操作（VERIFY/ACTIVATE/SUSPEND/RESUME）",
  "operationId": "uavStatus",
  "req": {
   "action": "ACTIVATE",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": null,
    "uav": {
     "created_at": "2026-10-06 14:34:00.182",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-ce23702e2f3e",
     "registration_mark": "UAS-96340857",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-06 14:34:00.194"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.194",
   "trace_id": "TRACE-20261006-5df93f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-10-06 14:34:00.348",
   "trace_id": "TRACE-20261006-b58e5a"
  }
 },
 {
  "path": "/api/mission/create",
  "tag": "任务",
  "summary": "任务创建（密文入库，脱敏展示）",
  "operationId": "missionCreate",
  "req": {
   "altitude_max": 120,
   "altitude_min": 60,
   "description": "巡线走廊Zone-A全线巡检",
   "end_time": "2026-09-12 11:00:00",
   "mission_type": "POWER_INSPECTION",
   "operator_id": "Operator-A",
   "payload_type": "CAMERA",
   "route_segments": [
    "R101",
    "R205",
    "R306"
   ],
   "start_time": "2026-09-12 09:00:00",
   "uav_id": "UAV-A-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "altitude_max": 120,
    "altitude_min": 60,
    "created_at": "2026-10-06 14:34:00.204",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIIChaQCuL0UaFAHek9z9ZTlQiDXXxtsAJauPHb6/UxCzA0IABI9huVPURvWGU5Zx5Bf1N18yJ61+BXbKyHrEnQkCt8YVVTCWQ8Q1seqBLKvq0xGGvWHpDHKtVlotlfG40oP79Pg=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-06 14:34:00.204",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.205",
   "trace_id": "TRACE-20261006-f8e89a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-10-06 14:34:00.349",
   "trace_id": "TRACE-20261006-e3c86a"
  }
 },
 {
  "path": "/api/mission/list",
  "tag": "任务",
  "summary": "任务列表（分页）",
  "operationId": "missionList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "altitude_max": 120,
      "altitude_min": 60,
      "created_at": "2026-10-06 14:34:00.204",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "pilot_license_id": "",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIIChaQCuL0UaFAHek9z9ZTlQiDXXxtsAJauPHb6/UxCzA0IABI9huVPURvWGU5Zx5Bf1N18yJ61+BXbKyHrEnQkCt8YVVTCWQ8Q1seqBLKvq0xGGvWHpDHKtVlotlfG40oP79Pg=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-06 14:34:00.204",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.207",
   "trace_id": "TRACE-20261006-bcaf81"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.349",
   "trace_id": "TRACE-20261006-d12a3d"
  }
 },
 {
  "path": "/api/mission/query",
  "tag": "任务",
  "summary": "任务查询",
  "operationId": "missionQuery",
  "req": {
   "mission_id": "MISSION-2026-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "altitude_max": 120,
    "altitude_min": 60,
    "created_at": "2026-10-06 14:34:00.204",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIIChaQCuL0UaFAHek9z9ZTlQiDXXxtsAJauPHb6/UxCzA0IABI9huVPURvWGU5Zx5Bf1N18yJ61+BXbKyHrEnQkCt8YVVTCWQ8Q1seqBLKvq0xGGvWHpDHKtVlotlfG40oP79Pg=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-06 14:34:00.204",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.206",
   "trace_id": "TRACE-20261006-076825"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-10-06 14:34:00.349",
   "trace_id": "TRACE-20261006-932ade"
  }
 },
 {
  "path": "/api/mission/submit",
  "tag": "任务",
  "summary": "任务提交（源链交易 + MISSION_APPLICATION 跨链中继）",
  "operationId": "missionSubmit",
  "req": {
   "mission_id": "MISSION-2026-001",
   "operator": "Operator-A"
  },
  "resp": {
   "code": 0,
   "data": {
    "application": {
     "application_id": "APP-20261006-05b66e",
     "created_at": "2026-10-06 14:34:00.210",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEIJKKLyqIAPhlhgd7UF7HE4fnWeWe4gey+7P79oz5ArS6A0IABD/nDcBoAZhZLMAoJILRt5CxPgT02Hko4/V09DpbePkMAmWDd6z/o4TNTMa53i/LfkjmuRB8Kf2A8bF0FYoQf0A=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-78a7dac9a104abbd97e10d92166124cb",
     "status": "RELAYED",
     "updated_at": "2026-10-06 14:34:00.219"
    },
    "crosschain": {
     "business_id": "APP-20261006-05b66e",
     "created_at": "2026-10-06 14:34:00.211",
     "cross_tx_id": "CX-6ede63c66409",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "81369eb4095a5ba8edbca706cf5cc526c8ade3513b491801ba73e682d3884323",
     "latency_ms": 6,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-a1aa748debc61612f69f5dcb7a283aa0",
     "reg_record_id": "REGREC-6aca47a76408",
     "reg_relay_tx_id": "CHAINMAKER-b0c26f5474ebd879fba1923e1869a2e2",
     "retry_of": "",
     "signature": "MGYEIHeML/D2lt8zFU6OnT8slj1qnhKShSoqWQjmNVNraND+A0IABKTwaJ9uhMrL0SGaoHjUrLLtbbBG4Bq+/rowEwrPc7zzMxz3D+ncN/FQerjIo8St59luWelQLnFnEgejchCc2yM=",
     "sm3_hash": "0de0ce36c3c5330b2cc129f5b15ea294fd2baa2838847391ced3d506e188a069",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-78a7dac9a104abbd97e10d92166124cb",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-3b1c105b6e9bab5f4e48aaee997d0f76",
     "updated_at": "2026-10-06 14:34:00.218",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.219",
   "trace_id": "TRACE-20261006-57cea4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-10-06 14:34:00.350",
   "trace_id": "TRACE-20261006-efbcd3"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20261006-05b66e"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20261006-05b66e",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-835810e90cfe",
      "review_time": "2026-10-06 14:34:00.221",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.231",
   "trace_id": "TRACE-20261006-127263"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-10-06 14:34:00.351",
   "trace_id": "TRACE-20261006-386abb"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20261006-05b66e",
   "comment": "同意执行",
   "result": "APPROVED",
   "reviewer": "FISCO-ADMIN",
   "rules_hit": [
    "R-ALT-001"
   ]
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "REV-835810e90cfe",
     "created_at": "2026-10-06 14:34:00.222",
     "cross_tx_id": "CX-44d124dfdeab",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "8cd3cc13f38170e54dcfaa15da5c7e1002c499c57decb59132df99621923facd",
     "latency_ms": 6,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-3dcf690fbc7698030173f5e4479d9b40",
     "reg_record_id": "REGREC-7522580751e6",
     "reg_relay_tx_id": "CHAINMAKER-60c90d70ea9e564639d99c79a3cd0de0",
     "retry_of": "",
     "signature": "MGYEIKIg+rFRCLyW/9NholEKiQL5X9vjIPZgx4zY6ezK2wVmA0IABE27j78ujlmHB5r+cFWjIbSRrF1HziUm+qEh0gpF1UlJB4Ng51fU/SE+QksMukobcmjh9ftOxJmtgxzWPIW3R60=",
     "sm3_hash": "e3620a36a6c17a8e6e7dc58ee1c3c1cb2a1662be9e42817bc55403b4477121e7",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-a17bfbbee26c00ec1c1ef6676596481c",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-35258559d78ef48cf12fb3644367f15e",
     "updated_at": "2026-10-06 14:34:00.229",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-06 14:34:00.204",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIChaQCuL0UaFAHek9z9ZTlQiDXXxtsAJauPHb6/UxCzA0IABI9huVPURvWGU5Zx5Bf1N18yJ61+BXbKyHrEnQkCt8YVVTCWQ8Q1seqBLKvq0xGGvWHpDHKtVlotlfG40oP79Pg=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-06 14:34:00.229",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20261006-05b66e",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-835810e90cfe",
     "review_time": "2026-10-06 14:34:00.221",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.230",
   "trace_id": "TRACE-20261006-4169fa"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-10-06 14:34:00.350",
   "trace_id": "TRACE-20261006-e54659"
  }
 },
 {
  "path": "/api/conflict/detect",
  "tag": "冲突",
  "summary": "时空冲突检测（三维重叠，主动方进 COORDINATING）",
  "operationId": "conflictDetect",
  "req": {
   "mission_id": "MISSION-2026-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "conflicts": [],
    "count": 0
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.232",
   "trace_id": "TRACE-20261006-350e69"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-10-06 14:34:00.354",
   "trace_id": "TRACE-20261006-e0f090"
  }
 },
 {
  "path": "/api/conflict/resolve",
  "tag": "冲突",
  "summary": "冲突协调处置。样例为确定性错误（未知 conflict_id→6002）；成功路径见场景 TC1-06",
  "operationId": "conflictResolve",
  "req": {
   "conflict_id": "CFL-NOPE-001",
   "operator": "Operator-B",
   "resolution": "时间窗后移30分钟"
  },
  "resp": {
   "code": 6002,
   "data": null,
   "message": "biz error 6002: conflict_id \"CFL-NOPE-001\" 不存在",
   "timestamp": "2026-10-06 14:34:00.233",
   "trace_id": "TRACE-20261006-fb88a7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-10-06 14:34:00.355",
   "trace_id": "TRACE-20261006-1e66cd"
  }
 },
 {
  "path": "/api/pass/issue",
  "tag": "通行许可",
  "summary": "飞行许可签发（FLIGHT_PASS 管理→监管→运营）",
  "operationId": "passIssue",
  "req": {
   "issuer": "FISCO-ADMIN",
   "mission_id": "MISSION-2026-001",
   "pass_id": "PASS-2026-001",
   "valid_from": "2026-10-06 13:34:00.152",
   "valid_to": "2026-10-06 15:34:00.152"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-06 14:34:00.237",
     "cross_tx_id": "CX-3c60e40a252a",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 6,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-17efc21eea76a58f70d41bd3c7cd9180",
     "reg_record_id": "REGREC-1d53c6e58a8a",
     "reg_relay_tx_id": "CHAINMAKER-16a495a9b3e7a482efce0a92375bf0d5",
     "retry_of": "",
     "signature": "MGYEICFZKOWJWxwxJffLPkky+wiN5KWjQgfrEj5vHWc0QPbAA0IABGV+GBVf7rqjcqUGxa/mfO9u0ydbYuYzmN3rdF0PrghHEmnddOiAwhWhe0YeTvcpmO+xaIWtMDgaa5jat6CTPe0=",
     "sm3_hash": "1345cf72d95e991351b2b38d0e4027262cfe21f08c45070af46c5674c448c8c5",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-89db355f3cf0fe0863af4023449b2773",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-523cd52edb9696fdd6e980fd50354f31",
     "updated_at": "2026-10-06 14:34:00.243",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-10-06 14:34:00.235",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIHm7EAubJu10CLwCGIAV90WENp+TaRbfGsfswe71GagRA0IABEy4dT4BWfDMf8XLMCM/1YHv9ymnEpCOGR+qneA5CGLGX/mCB0LDvJkMNg7cT9YkRgvtzhsY2vI2R+VO/4zFKFI=",
     "sm3_hash": "0dc5a9faa749dfca8ba8265bf8345ccc7dde88b9db3d83c3555d1563fcdee4d3",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-06 14:34:00.244",
     "valid_from": "2026-10-06 13:34:00.152",
     "valid_to": "2026-10-06 15:34:00.152"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.245",
   "trace_id": "TRACE-20261006-9c2ff6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-10-06 14:34:00.357",
   "trace_id": "TRACE-20261006-db05ca"
  }
 },
 {
  "path": "/api/pass/list",
  "tag": "通行许可",
  "summary": "许可列表（分页）",
  "operationId": "passList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-06 14:34:00.235",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIHm7EAubJu10CLwCGIAV90WENp+TaRbfGsfswe71GagRA0IABEy4dT4BWfDMf8XLMCM/1YHv9ymnEpCOGR+qneA5CGLGX/mCB0LDvJkMNg7cT9YkRgvtzhsY2vI2R+VO/4zFKFI=",
      "sm3_hash": "0dc5a9faa749dfca8ba8265bf8345ccc7dde88b9db3d83c3555d1563fcdee4d3",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-06 14:34:00.244",
      "valid_from": "2026-10-06 13:34:00.152",
      "valid_to": "2026-10-06 15:34:00.152"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.247",
   "trace_id": "TRACE-20261006-7a9878"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.358",
   "trace_id": "TRACE-20261006-4c9e83"
  }
 },
 {
  "path": "/api/pass/query",
  "tag": "通行许可",
  "summary": "许可查询",
  "operationId": "passQuery",
  "req": {
   "pass_id": "PASS-2026-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-06 14:34:00.235",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIHm7EAubJu10CLwCGIAV90WENp+TaRbfGsfswe71GagRA0IABEy4dT4BWfDMf8XLMCM/1YHv9ymnEpCOGR+qneA5CGLGX/mCB0LDvJkMNg7cT9YkRgvtzhsY2vI2R+VO/4zFKFI=",
    "sm3_hash": "0dc5a9faa749dfca8ba8265bf8345ccc7dde88b9db3d83c3555d1563fcdee4d3",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-06 14:34:00.244",
    "valid_from": "2026-10-06 13:34:00.152",
    "valid_to": "2026-10-06 15:34:00.152"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.246",
   "trace_id": "TRACE-20261006-316624"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-06 14:34:00.357",
   "trace_id": "TRACE-20261006-1c10be"
  }
 },
 {
  "path": "/api/pass/revoke",
  "tag": "通行许可",
  "summary": "许可吊销（PASS_REVOKE 跨链重发）",
  "operationId": "passRevoke",
  "req": {
   "operator": "FISCO-ADMIN",
   "pass_id": "PASS-2026-001",
   "reason": "任务结束"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-06 14:34:00.254",
     "cross_tx_id": "CX-393a02f4d853",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 6,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-a5223cc2ac50b4c4e90d3c9522eb8077",
     "reg_record_id": "REGREC-e2323356aa40",
     "reg_relay_tx_id": "CHAINMAKER-31a356b1d6f5c97dbd214b730ea47423",
     "retry_of": "",
     "signature": "MGYEIE+0boNPBJNrMV1kxKq6dLKmQg94uQSCOus5/iq9sMIFA0IABGPqFfHfDlbxo9lsVHnX9y4yS00hELs9fR6zHC8wwUYpGALWi4mdmd+uWAO2LBJfdF/YSlgCyxvYhX8WkOaU9Hk=",
     "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-9ac17ae933a02121240cae8631d2f76e",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
     "updated_at": "2026-10-06 14:34:00.260",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-10-06 14:34:00.235",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIHm7EAubJu10CLwCGIAV90WENp+TaRbfGsfswe71GagRA0IABEy4dT4BWfDMf8XLMCM/1YHv9ymnEpCOGR+qneA5CGLGX/mCB0LDvJkMNg7cT9YkRgvtzhsY2vI2R+VO/4zFKFI=",
     "sm3_hash": "0dc5a9faa749dfca8ba8265bf8345ccc7dde88b9db3d83c3555d1563fcdee4d3",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-06 14:34:00.251",
     "valid_from": "2026-10-06 13:34:00.152",
     "valid_to": "2026-10-06 15:34:00.152"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.261",
   "trace_id": "TRACE-20261006-3b9635"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-10-06 14:34:00.358",
   "trace_id": "TRACE-20261006-4a27ee"
  }
 },
 {
  "path": "/api/pass/verify",
  "tag": "通行许可",
  "summary": "许可验证（valid/reasons/status；吊销后 valid=false）",
  "operationId": "passVerify",
  "req": {
   "pass_id": "PASS-2026-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "pass_id": "PASS-2026-001",
    "reasons": [],
    "status": "VALID",
    "valid": true
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.250",
   "trace_id": "TRACE-20261006-8db8eb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-06 14:34:00.358",
   "trace_id": "TRACE-20261006-7a154c"
  }
 },
 {
  "path": "/api/node/list",
  "tag": "链下网络",
  "summary": "节点列表（可选过滤 node_type/status）",
  "operationId": "nodeList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.62,
      "lon": 114.42,
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.264",
      "lat": 0,
      "lon": 0,
      "neighbors": "[]",
      "node_id": "N-DOC-1",
      "node_type": "EDGE",
      "position": "{\"X\":10,\"Y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N-DOC-1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.53,
      "lon": 114.33,
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.548,
      "lon": 114.348,
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.572,
      "lon": 114.372,
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.598,
      "lon": 114.398,
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.556,
      "lon": 114.356,
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.64,
      "lon": 114.44,
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.51,
      "lon": 114.31,
      "neighbors": "[\"N1\"]",
      "node_id": "UAV-A-001-NODE",
      "node_type": "UAV",
      "position": "{\"x\":0,\"y\":0}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-UAV-A-001-NODE",
      "status": "ONLINE"
     }
    ],
    "total": 9
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.265",
   "trace_id": "TRACE-20261006-300832"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.359",
   "trace_id": "TRACE-20261006-e58061"
  }
 },
 {
  "path": "/api/node/register",
  "tag": "链下网络",
  "summary": "节点注册（UAV/EDGE/MANAGEMENT/ATTACKER）",
  "operationId": "nodeRegister",
  "req": {
   "node_id": "N-DOC-1",
   "node_type": "EDGE",
   "position": {
    "X": 10,
    "Y": 10
   }
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-06 14:34:00.264",
    "lat": 0,
    "lon": 0,
    "neighbors": "[]",
    "node_id": "N-DOC-1",
    "node_type": "EDGE",
    "position": "{\"X\":10,\"Y\":10}",
    "risk_score": 0,
    "sm9_identity": "SM9-ID-N-DOC-1",
    "status": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.264",
   "trace_id": "TRACE-20261006-d55910"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-10-06 14:34:00.359",
   "trace_id": "TRACE-20261006-97a051"
  }
 },
 {
  "path": "/api/topology/get",
  "tag": "链下网络",
  "summary": "网络拓扑视图（节点/边/虫洞状态/隔离集）",
  "operationId": "topologyGet",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "active_sessions": 0,
    "edges": [
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "MGR",
      "to": "N4",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N1",
      "to": "N2",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N1",
      "to": "UAV-A-001-NODE",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N2",
      "to": "N3",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N3",
      "to": "N4",
      "wormhole_edge": false
     }
    ],
    "isolated": [],
    "nodes": [
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.62,
      "lon": 114.42,
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.53,
      "lon": 114.33,
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.548,
      "lon": 114.348,
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.572,
      "lon": 114.372,
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.598,
      "lon": 114.398,
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.556,
      "lon": 114.356,
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.161",
      "lat": 30.64,
      "lon": 114.44,
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.160",
      "lat": 30.51,
      "lon": 114.31,
      "neighbors": "[\"N1\"]",
      "node_id": "UAV-A-001-NODE",
      "node_type": "UAV",
      "position": "{\"x\":0,\"y\":0}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-UAV-A-001-NODE",
      "status": "ONLINE"
     }
    ],
    "wormhole_enabled": false
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.263",
   "trace_id": "TRACE-20261006-c016ba"
  },
  "err": {
   "code": 0,
   "data": {
    "active_sessions": 0,
    "edges": [
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "MGR",
      "to": "N4",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N1",
      "to": "N2",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N1",
      "to": "UAV-A-001-NODE",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N2",
      "to": "N3",
      "wormhole_edge": false
     },
     {
      "advertised_latency_ms": 8,
      "distance": 14.142135623730951,
      "from": "N3",
      "to": "N4",
      "wormhole_edge": false
     }
    ],
    "isolated": [],
    "nodes": [
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.62,
      "lon": 114.42,
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.53,
      "lon": 114.33,
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.548,
      "lon": 114.348,
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.572,
      "lon": 114.372,
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.598,
      "lon": 114.398,
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.556,
      "lon": 114.356,
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.344",
      "lat": 30.64,
      "lon": 114.44,
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-10-06 14:34:00.343",
      "lat": 30.51,
      "lon": 114.31,
      "neighbors": "[\"N1\"]",
      "node_id": "UAV-A-001-NODE",
      "node_type": "UAV",
      "position": "{\"x\":0,\"y\":0}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-UAV-A-001-NODE",
      "status": "ONLINE"
     }
    ],
    "wormhole_enabled": false
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.359",
   "trace_id": "TRACE-20261006-064a8a"
  }
 },
 {
  "path": "/api/session/close",
  "tag": "会话",
  "summary": "会话关闭（关闭后发消息→4002）",
  "operationId": "sessionClose",
  "req": {
   "operator": "OP-1",
   "reason": "文档演示完毕",
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-06 14:34:00.267",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-6705e7af5ad2",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-06 14:34:00.290"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.291",
   "trace_id": "TRACE-20261006-4c78c1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-10-06 14:34:00.361",
   "trace_id": "TRACE-20261006-15621a"
  }
 },
 {
  "path": "/api/session/list",
  "tag": "会话",
  "summary": "会话列表（可选过滤 status）",
  "operationId": "sessionList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-06 14:34:00.267",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-6705e7af5ad2",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-06 14:34:00.267"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.270",
   "trace_id": "TRACE-20261006-d9df8d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-d3219a"
  }
 },
 {
  "path": "/api/session/open",
  "tag": "会话",
  "summary": "会话建立（SM9 挑战认证 + 初始可信路径）",
  "operationId": "sessionOpen",
  "req": {
   "uav_id": "UAV-A-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "auth": {
     "nonce": "NONCE-54224ea624411d875bbaa72f4484bfbf",
     "signature": "MGYEIJM/BWC/sUdUqstruQ4/q8rLk6v0lg5q2cQ20z+PisqxA0IABChbL0PFpmKYNZGGUUIim/9SPdkKiZCpPyCEzwu7x7LsoF0hEU6Z2Adkz12OHkuSbLyW8XM789v+DjAoiQwqvMU=",
     "sm9_identity": "SM9-ID-UAV-A-001-NODE",
     "verified": true
    },
    "path": [
     "UAV-A-001-NODE",
     "N1",
     "N2",
     "N3",
     "N4",
     "MGR"
    ],
    "session": {
     "created_at": "2026-10-06 14:34:00.267",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-6705e7af5ad2",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-06 14:34:00.267"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.269",
   "trace_id": "TRACE-20261006-4cf618"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-944c6c"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-06 14:34:00.272",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIE3HCqjf5E04qOtQyODrrGL8vtJHKPrSMF0NgZQFa45qA0IABFXqJXTJgfx8O0wi6Cb+gcXdChAck4iaY+Y3yHQOzd6HsbYtHVWYNjIxNYfyitP/2KAZOOhEuq7hANj23H/lPvI=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-d7b0ee43b64cb356",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-6705e7af5ad2",
      "sm3_hash": "7f834c6452b62de2817ba5ca8fb843de3b1c0edf8caff614296c439ef000f476",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-10-06 14:34:00.271"
     }
    ],
    "stats": {
     "avg_latency_ms": 45,
     "count": 1,
     "max_latency_ms": 45,
     "p50_latency_ms": 45,
     "p95_latency_ms": 45,
     "success_count": 1,
     "success_rate": 1
    },
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.274",
   "trace_id": "TRACE-20261006-e25a8b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-77687a"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-6705e7af5ad2",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-10-06 14:34:00.272",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIE3HCqjf5E04qOtQyODrrGL8vtJHKPrSMF0NgZQFa45qA0IABFXqJXTJgfx8O0wi6Cb+gcXdChAck4iaY+Y3yHQOzd6HsbYtHVWYNjIxNYfyitP/2KAZOOhEuq7hANj23H/lPvI=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-d7b0ee43b64cb356",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-6705e7af5ad2",
     "sm3_hash": "7f834c6452b62de2817ba5ca8fb843de3b1c0edf8caff614296c439ef000f476",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-10-06 14:34:00.271"
    },
    "path_detail": [
     {
      "from": "UAV-A-001-NODE",
      "latency_ms": 9,
      "to": "N1"
     },
     {
      "from": "N1",
      "latency_ms": 9,
      "to": "N2"
     },
     {
      "from": "N2",
      "latency_ms": 9,
      "to": "N3"
     },
     {
      "from": "N3",
      "latency_ms": 9,
      "to": "N4"
     },
     {
      "from": "N4",
      "latency_ms": 9,
      "to": "MGR"
     }
    ]
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.273",
   "trace_id": "TRACE-20261006-30e9fb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-6664c3"
  }
 },
 {
  "path": "/api/telemetry/latest",
  "tag": "遥测",
  "summary": "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）",
  "operationId": "telemetryLatest",
  "req": {
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-06 14:34:00.275",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-06 14:34:00.275",
     "seq": 1,
     "session_id": "SESS-6705e7af5ad2",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-591f8d98090f",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.279",
   "trace_id": "TRACE-20261006-733e35"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-a4a346"
  }
 },
 {
  "path": "/api/telemetry/list",
  "tag": "遥测",
  "summary": "遥测分页列表（session_id/uav_id 过滤）",
  "operationId": "telemetryList",
  "req": {
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alt": 85,
      "created_at": "2026-10-06 14:34:00.275",
      "heading": 45,
      "lat": 30.52,
      "lon": 114.32,
      "mission_id": "",
      "reported_at": "2026-10-06 14:34:00.275",
      "seq": 1,
      "session_id": "SESS-6705e7af5ad2",
      "source": "MANUAL",
      "speed": 12,
      "telemetry_id": "TLM-591f8d98090f",
      "uav_id": "UAV-A-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.277",
   "trace_id": "TRACE-20261006-9f1aea"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-53b3a9"
  }
 },
 {
  "path": "/api/telemetry/report",
  "tag": "遥测",
  "summary": "遥测上报（会话须 ACTIVE，否则→7003；seq 服务端自增）",
  "operationId": "telemetryReport",
  "req": {
   "alt": 85,
   "heading": 45,
   "lat": 30.52,
   "lon": 114.32,
   "session_id": "SESS-6705e7af5ad2",
   "speed": 12
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-06 14:34:00.275",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-06 14:34:00.275",
     "seq": 1,
     "session_id": "SESS-6705e7af5ad2",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-591f8d98090f",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.276",
   "trace_id": "TRACE-20261006-cde06b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.TelemetryReportRequest",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-6df0c1"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [],
    "total": 0
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.289",
   "trace_id": "TRACE-20261006-4a20be"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.361",
   "trace_id": "TRACE-20261006-7ba88f"
  }
 },
 {
  "path": "/api/path/switch",
  "tag": "攻防",
  "summary": "受攻击会话路径自动规避切换。样例为确定性错误（未知 session→6002）；成功路径见场景 TC2-06",
  "operationId": "pathSwitch",
  "req": {
   "operator": "OP-1",
   "session_id": "SESS-NOPE-001"
  },
  "resp": {
   "code": 6002,
   "data": null,
   "message": "biz error 6002: session SESS-NOPE-001 not found",
   "timestamp": "2026-10-06 14:34:00.289",
   "trace_id": "TRACE-20261006-a46d96"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-10-06 14:34:00.361",
   "trace_id": "TRACE-20261006-85cae4"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-6705e7af5ad2"
  },
  "resp": {
   "code": 0,
   "data": {
    "dimensions": {
     "adjacency": 0,
     "challenge": 0,
     "identity": 0,
     "latency": 0,
     "path": 0
    },
    "events": [],
    "risk_score": 0,
    "session_status": "ACTIVE",
    "threshold": 0.7,
    "verdict": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.286",
   "trace_id": "TRACE-20261006-62cb82"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-10-06 14:34:00.361",
   "trace_id": "TRACE-20261006-178359"
  }
 },
 {
  "path": "/api/wormhole/toggle",
  "tag": "攻防",
  "summary": "虫洞攻击开关（X/Y 隧道；ISOLATED 后重开→4001）",
  "operationId": "wormholeToggle",
  "req": {
   "enabled": true,
   "operator": "ATTACKER-SIM"
  },
  "resp": {
   "code": 0,
   "data": {
    "nodes_affected": [
     "NODE-X",
     "NODE-Y",
     "N1",
     "N4"
    ],
    "wormhole_enabled": true
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.284",
   "trace_id": "TRACE-20261006-3f2fdb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-10-06 14:34:00.360",
   "trace_id": "TRACE-20261006-6e7dd9"
  }
 },
 {
  "path": "/api/alert/list",
  "tag": "告警",
  "summary": "告警列表（可选过滤 event_type/status/risk_level/source_system/mission_id）",
  "operationId": "alertList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-06 14:34:00.292",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-06 14:34:00.292"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.294",
   "trace_id": "TRACE-20261006-9d7699"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-f8dea3"
  }
 },
 {
  "path": "/api/alert/raise",
  "tag": "告警",
  "summary": "告警登记（匿名化：伪名+证据摘要，明文身份不出库）",
  "operationId": "alertRaise",
  "req": {
   "alert_id": "ALERT-2026-001",
   "event_type": "ROUTE_DEVIATION",
   "mission_id": "MISSION-2026-001",
   "operator": "REG-01",
   "risk_level": "HIGH",
   "source_system": "MANUAL",
   "uav_pseudonym": "PSEUDO-UAV-83921"
  },
  "resp": {
   "code": 0,
   "data": {
    "alert_id": "ALERT-2026-001",
    "created_at": "2026-10-06 14:34:00.292",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-06 14:34:00.292"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.293",
   "trace_id": "TRACE-20261006-557d27"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-4e6611"
  }
 },
 {
  "path": "/api/alert/status",
  "tag": "告警",
  "summary": "告警状态机推进（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED，跨级→6002）",
  "operationId": "alertStatus",
  "req": {
   "alert_id": "ALERT-2026-001",
   "operator": "REG-01",
   "reason": "初判成立",
   "to_status": "IDENTIFIED"
  },
  "resp": {
   "code": 0,
   "data": {
    "alert_id": "ALERT-2026-001",
    "created_at": "2026-10-06 14:34:00.292",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-06 14:34:00.295"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.295",
   "trace_id": "TRACE-20261006-53ddc9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-9c26bc"
  }
 },
 {
  "path": "/api/trace/identity",
  "tag": "追踪",
  "summary": "七级身份追踪（告警/伪名/许可入口；断链→5001+断点留痕）",
  "operationId": "traceIdentity",
  "req": {
   "alert_id": "ALERT-2026-001",
   "operator": "REG-01"
  },
  "resp": {
   "code": 0,
   "data": {
    "break_level": 0,
    "entry": "ALERT-2026-001",
    "entry_type": "ALERT_ID",
    "levels": [
     {
      "latency_ms": 0,
      "level": 1,
      "name": "PSEUDO",
      "source": "CHAINMAKER_INDEX",
      "status": "RESOLVED",
      "value": "PSEUDO-UAV-83921"
     },
     {
      "latency_ms": 0,
      "level": 2,
      "name": "DEVICE_ADDRESS",
      "source": "CHAINMAKER_INDEX",
      "status": "RESOLVED",
      "value": "0xADDR83921"
     },
     {
      "latency_ms": 0,
      "level": 3,
      "name": "PASS_ID",
      "source": "CHAINMAKER_INDEX",
      "status": "RESOLVED",
      "value": "PASS-2026-001"
     },
     {
      "latency_ms": 0,
      "level": 4,
      "name": "SM9_IDENTITY",
      "source": "CHAINMAKER_INDEX",
      "status": "RESOLVED",
      "value": "SM9-ID-UAV-A-001"
     },
     {
      "latency_ms": 0,
      "level": 5,
      "name": "UAV_ID",
      "source": "FABRIC_DETAIL",
      "status": "RESOLVED",
      "value": "UAV-A-001"
     },
     {
      "latency_ms": 0,
      "level": 6,
      "name": "OPERATOR_ID",
      "source": "FABRIC_DETAIL",
      "status": "RESOLVED",
      "value": "Operator-A"
     },
     {
      "latency_ms": 0,
      "level": 7,
      "name": "MANUFACTURER_ID",
      "source": "FISCO_BCOS_DETAIL",
      "status": "RESOLVED",
      "value": "Manufacturer-B"
     }
    ],
    "pseudonym": "PSEUDO-UAV-83921",
    "resolved": true,
    "trace_latency_ms": 0
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.297",
   "trace_id": "TRACE-20261006-75c41a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-719c5e"
  }
 },
 {
  "path": "/api/authorize/apply",
  "tag": "授权",
  "summary": "监管授权申请（范围最小化，审计摘要上链前置）",
  "operationId": "authorizeApply",
  "req": {
   "authorization_id": "AUTH-2026-001",
   "reason": "核查告警 ALERT-2026-001",
   "regulator_id": "REG-01",
   "scope": [
    "MISSION",
    "ROUTE",
    "PAYLOAD",
    "IDENTITY"
   ],
   "target_id": "MISSION-2026-001",
   "target_type": "MISSION"
  },
  "resp": {
   "code": 0,
   "data": {
    "audit_hash": "15e6eae0c5e2512eb198782b5636ab345d29b0eaa77244a7a3f1305f0bf9a472",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-10-06 14:34:00.298",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-10-06 14:34:00.298",
    "valid_from": "2026-10-06 14:34:00.297",
    "valid_to": "2026-10-07 14:34:00.297"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.298",
   "trace_id": "TRACE-20261006-bf8589"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-2f8ccb"
  }
 },
 {
  "path": "/api/authorize/review",
  "tag": "授权",
  "summary": "授权审批（APPROVE 上链 chainmaker；复审→6002）",
  "operationId": "authorizeReview",
  "req": {
   "authorization_id": "AUTH-2026-001",
   "comment": "同意",
   "decision": "APPROVE",
   "reviewer_id": "REG-ADMIN"
  },
  "resp": {
   "code": 0,
   "data": {
    "audit": {
     "action": "AUTH_APPROVE",
     "alert_id": "",
     "audit_hash": "15e6eae0c5e2512eb198782b5636ab345d29b0eaa77244a7a3f1305f0bf9a472",
     "audit_id": "AUD-f7a7fc5c19c1",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-eb77f6c85df1ae685968bd69a3ffa0d0",
     "created_at": "2026-10-06 14:34:00.299",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "15e6eae0c5e2512eb198782b5636ab345d29b0eaa77244a7a3f1305f0bf9a472",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-10-06 14:34:00.298",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-10-06 14:34:00.299",
     "valid_from": "2026-10-06 14:34:00.297",
     "valid_to": "2026-10-07 14:34:00.297"
    },
    "chain_tx_id": "CHAINMAKER-eb77f6c85df1ae685968bd69a3ffa0d0"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.300",
   "trace_id": "TRACE-20261006-4549ac"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-10-06 14:34:00.362",
   "trace_id": "TRACE-20261006-c05e8f"
  }
 },
 {
  "path": "/api/inspect/ciphertext",
  "tag": "核查",
  "summary": "密文核验（未授权→5002+封缄；授权→明文视图+双验证+结论上链）",
  "operationId": "inspectCiphertext",
  "req": {
   "authorization_id": "AUTH-2026-001",
   "mission_id": "MISSION-2026-001",
   "payload_type": "CAMERA",
   "regulator_id": "REG-01",
   "trajectory": "NORMAL"
  },
  "resp": {
   "code": 0,
   "data": {
    "authorized": true,
    "chain_tx_id": "CHAINMAKER-4c37a185d8835e00aadf2ca3cec29629",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-06 14:34:00.204",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIChaQCuL0UaFAHek9z9ZTlQiDXXxtsAJauPHb6/UxCzA0IABI9huVPURvWGU5Zx5Bf1N18yJ61+BXbKyHrEnQkCt8YVVTCWQ8Q1seqBLKvq0xGGvWHpDHKtVlotlfG40oP79Pg=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-06 14:34:00.229",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-035b5b340b0d",
    "scope": [
     "MISSION",
     "ROUTE",
     "PAYLOAD",
     "IDENTITY"
    ],
    "sealed": {
     "ciphertext_status": "OPENED",
     "has_ciphertext": true,
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79"
    },
    "verification": {
     "audit_hash": "6787b0704d26d75390a7e24df2990e5c87f8210b008af9afda8993a276cac570",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.307",
   "trace_id": "TRACE-20261006-0189f8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-f5cdef"
  }
 },
 {
  "path": "/api/regulatory/audit/export",
  "tag": "监管审计",
  "summary": "监管审计 CSV 导出",
  "operationId": "regulatoryAuditExport",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-035b5b340b0d,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",6787b0704d26d75390a7e24df2990e5c87f8210b008af9afda8993a276cac570,CHAINMAKER-4c37a185d8835e00aadf2ca3cec29629,2026-10-06 14:34:00.305\nAUD-f7a7fc5c19c1,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",15e6eae0c5e2512eb198782b5636ab345d29b0eaa77244a7a3f1305f0bf9a472,CHAINMAKER-eb77f6c85df1ae685968bd69a3ffa0d0,2026-10-06 14:34:00.299\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.315",
   "trace_id": "TRACE-20261006-3cd7fa"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-e0afc3"
  }
 },
 {
  "path": "/api/regulatory/audit/list",
  "tag": "监管审计",
  "summary": "监管审计查询（INSPECT/AUTH_APPROVE 等）",
  "operationId": "regulatoryAuditList",
  "req": {
   "action": "INSPECT"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "action": "INSPECT",
      "alert_id": "",
      "audit_hash": "6787b0704d26d75390a7e24df2990e5c87f8210b008af9afda8993a276cac570",
      "audit_id": "AUD-035b5b340b0d",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-4c37a185d8835e00aadf2ca3cec29629",
      "created_at": "2026-10-06 14:34:00.305",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.313",
   "trace_id": "TRACE-20261006-b786ee"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-9829f7"
  }
 },
 {
  "path": "/api/audit/export",
  "tag": "审计",
  "summary": "全域审计 CSV 导出",
  "operationId": "auditExport",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n77,TRACE-20261006-0189f8,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-4c37a185d8835e00aadf2ca3cec29629\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-10-06 14:34:00.306\n76,TRACE-20261006-4549ac,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-eb77f6c85df1ae685968bd69a3ffa0d0\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-10-06 14:34:00.299\n75,TRACE-20261006-bf8589,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-10-06 14:34:00.297\"\",\"\"valid_to\"\":\"\"2026-10-07 14:34:00.297\"\"}\",2026-10-06 14:34:00.298\n74,TRACE-20261006-75c41a,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":0,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-06 14:34:00.296\n73,TRACE-20261006-53ddc9,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-10-06 14:34:00.295\n72,TRACE-20261006-557d27,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-10-06 14:34:00.292\n71,TRACE-20261006-4c78c1,OP-1,SESSION_CLOSE,SESSION,SESS-6705e7af5ad2,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-10-06 14:34:00.291\n70,TRACE-20261006-4c78c1,OP-1,STATE_TRANSITION,SESSION,SESS-6705e7af5ad2,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-10-06 14:34:00.291\n69,TRACE-20261006-3f2fdb,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-10-06 14:34:00.283\n68,TRACE-20261006-cde06b,UAV-A-001,TELEMETRY_REPORT,TELEMETRY,TLM-591f8d98090f,\"{\"\"position\"\":[30.52,114.32,85],\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-6705e7af5ad2\"\",\"\"source\"\":\"\"MANUAL\"\"}\",2026-10-06 14:34:00.275\n67,TRACE-20261006-30e9fb,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-d7b0ee43b64cb356,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-6705e7af5ad2\"\"}\",2026-10-06 14:34:00.272\n66,TRACE-20261006-4cf618,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-6705e7af5ad2,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-06 14:34:00.268\n65,TRACE-20261006-4cf618,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-6705e7af5ad2,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-10-06 14:34:00.268\n64,TRACE-20261006-4cf618,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-6705e7af5ad2,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-10-06 14:34:00.267\n63,TRACE-20261006-d55910,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-10-06 14:34:00.264\n62,TRACE-20261006-3b9635,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-393a02f4d853,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":6,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-a5223cc2ac50b4c4e90d3c9522eb8077\"\",\"\"reg_record_id\"\":\"\"REGREC-e2323356aa40\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-31a356b1d6f5c97dbd214b730ea47423\"\",\"\"source_chain_tx_id\"\":\"\"FISCO-BCOS-9ac17ae933a02121240cae8631d2f76e\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-10-06 14:34:00.261\n61,TRACE-20261006-3b9635,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-393a02f4d853,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20261006-3b9635\"\"}\",2026-10-06 14:34:00.260\n60,TRACE-20261006-3b9635,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-393a02f4d853,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20261006-3b9635\"\"}\",2026-10-06 14:34:00.259\n59,TRACE-20261006-3b9635,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-393a02f4d853,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20261006-3b9635\"\"}\",2026-10-06 14:34:00.259\n58,TRACE-20261006-3b9635,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-393a02f4d853,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20261006-3b9635\"\"}\",2026-10-06 14:34:00.258\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.317",
   "trace_id": "TRACE-20261006-5ddf5b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-e86b01"
  }
 },
 {
  "path": "/api/audit/query",
  "tag": "审计",
  "summary": "全域审计查询（actor/action/business_id 过滤）",
  "operationId": "auditQuery",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "action": "INSPECT",
      "actor": "REG-01",
      "created_at": "2026-10-06 14:34:00.306",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-4c37a185d8835e00aadf2ca3cec29629\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 77,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20261006-0189f8"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-10-06 14:34:00.299",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-eb77f6c85df1ae685968bd69a3ffa0d0\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 76,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261006-4549ac"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-10-06 14:34:00.298",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-10-06 14:34:00.297\",\"valid_to\":\"2026-10-07 14:34:00.297\"}",
      "id": 75,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261006-bf8589"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-10-06 14:34:00.296",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":0,\"uav_id\":\"UAV-A-001\"}",
      "id": 74,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20261006-75c41a"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-10-06 14:34:00.295",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 73,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261006-53ddc9"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-10-06 14:34:00.292",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 72,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261006-557d27"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-10-06 14:34:00.291",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 71,
      "target_id": "SESS-6705e7af5ad2",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261006-4c78c1"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-10-06 14:34:00.291",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 70,
      "target_id": "SESS-6705e7af5ad2",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261006-4c78c1"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-10-06 14:34:00.283",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 69,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20261006-3f2fdb"
     },
     {
      "action": "TELEMETRY_REPORT",
      "actor": "UAV-A-001",
      "created_at": "2026-10-06 14:34:00.275",
      "detail": "{\"position\":[30.52,114.32,85],\"seq\":1,\"session_id\":\"SESS-6705e7af5ad2\",\"source\":\"MANUAL\"}",
      "id": 68,
      "target_id": "TLM-591f8d98090f",
      "target_type": "TELEMETRY",
      "trace_id": "TRACE-20261006-cde06b"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-06 14:34:00.272",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-6705e7af5ad2\"}",
      "id": 67,
      "target_id": "MSG-d7b0ee43b64cb356",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20261006-30e9fb"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-06 14:34:00.268",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 66,
      "target_id": "SESS-6705e7af5ad2",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261006-4cf618"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-06 14:34:00.268",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 65,
      "target_id": "SESS-6705e7af5ad2",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261006-4cf618"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-06 14:34:00.267",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 64,
      "target_id": "SESS-6705e7af5ad2",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261006-4cf618"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-10-06 14:34:00.264",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 63,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20261006-d55910"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-10-06 14:34:00.261",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":6,\"reg_receive_tx_id\":\"CHAINMAKER-a5223cc2ac50b4c4e90d3c9522eb8077\",\"reg_record_id\":\"REGREC-e2323356aa40\",\"reg_relay_tx_id\":\"CHAINMAKER-31a356b1d6f5c97dbd214b730ea47423\",\"source_chain_tx_id\":\"FISCO-BCOS-9ac17ae933a02121240cae8631d2f76e\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\",\"verify_result\":\"PASS\"}",
      "id": 62,
      "target_id": "CX-393a02f4d853",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261006-3b9635"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-06 14:34:00.260",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20261006-3b9635\"}",
      "id": 61,
      "target_id": "CX-393a02f4d853",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261006-3b9635"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-06 14:34:00.259",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20261006-3b9635\"}",
      "id": 60,
      "target_id": "CX-393a02f4d853",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261006-3b9635"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-06 14:34:00.259",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20261006-3b9635\"}",
      "id": 59,
      "target_id": "CX-393a02f4d853",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261006-3b9635"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-06 14:34:00.258",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20261006-3b9635\"}",
      "id": 58,
      "target_id": "CX-393a02f4d853",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261006-3b9635"
     }
    ],
    "total": 77
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.316",
   "trace_id": "TRACE-20261006-ac0cbf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-df2195"
  }
 },
 {
  "path": "/api/crosschain/list",
  "tag": "跨链网关",
  "summary": "跨链交易列表（分页）",
  "operationId": "crosschainList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "business_id": "UAV-A-001",
      "created_at": "2026-10-06 14:34:00.319",
      "cross_tx_id": "CX-26735260ab85",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 6,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-b8cd1455dc852ce911b8f7103b7e28c2",
      "reg_record_id": "REGREC-380f0522e1ac",
      "reg_relay_tx_id": "CHAINMAKER-f091bd3a14a9500f45825ed0fcb8dfcc",
      "retry_of": "",
      "signature": "MGYEICi8E0JKE5+tdGmvb43bNvvuHwZSfjQNTSBs9YbYHQSmA0IABKb9A9K39p+Z53w2jYhdr6Wz4oeU4PBQRIMeBBZz62OFecKSIF6OIkYKPI3F9VWMWCw3XS0JNlrU2zEUQ1aViRA=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-fd1d1f6f38bd8ee3be2b1807f38b5d7f",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-10-06 14:34:00.326",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-06 14:34:00.254",
      "cross_tx_id": "CX-393a02f4d853",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 6,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-a5223cc2ac50b4c4e90d3c9522eb8077",
      "reg_record_id": "REGREC-e2323356aa40",
      "reg_relay_tx_id": "CHAINMAKER-31a356b1d6f5c97dbd214b730ea47423",
      "retry_of": "",
      "signature": "MGYEIE+0boNPBJNrMV1kxKq6dLKmQg94uQSCOus5/iq9sMIFA0IABGPqFfHfDlbxo9lsVHnX9y4yS00hELs9fR6zHC8wwUYpGALWi4mdmd+uWAO2LBJfdF/YSlgCyxvYhX8WkOaU9Hk=",
      "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-9ac17ae933a02121240cae8631d2f76e",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
      "updated_at": "2026-10-06 14:34:00.260",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-06 14:34:00.237",
      "cross_tx_id": "CX-3c60e40a252a",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 6,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-17efc21eea76a58f70d41bd3c7cd9180",
      "reg_record_id": "REGREC-1d53c6e58a8a",
      "reg_relay_tx_id": "CHAINMAKER-16a495a9b3e7a482efce0a92375bf0d5",
      "retry_of": "",
      "signature": "MGYEICFZKOWJWxwxJffLPkky+wiN5KWjQgfrEj5vHWc0QPbAA0IABGV+GBVf7rqjcqUGxa/mfO9u0ydbYuYzmN3rdF0PrghHEmnddOiAwhWhe0YeTvcpmO+xaIWtMDgaa5jat6CTPe0=",
      "sm3_hash": "1345cf72d95e991351b2b38d0e4027262cfe21f08c45070af46c5674c448c8c5",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-89db355f3cf0fe0863af4023449b2773",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-523cd52edb9696fdd6e980fd50354f31",
      "updated_at": "2026-10-06 14:34:00.243",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-835810e90cfe",
      "created_at": "2026-10-06 14:34:00.222",
      "cross_tx_id": "CX-44d124dfdeab",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "8cd3cc13f38170e54dcfaa15da5c7e1002c499c57decb59132df99621923facd",
      "latency_ms": 6,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-3dcf690fbc7698030173f5e4479d9b40",
      "reg_record_id": "REGREC-7522580751e6",
      "reg_relay_tx_id": "CHAINMAKER-60c90d70ea9e564639d99c79a3cd0de0",
      "retry_of": "",
      "signature": "MGYEIKIg+rFRCLyW/9NholEKiQL5X9vjIPZgx4zY6ezK2wVmA0IABE27j78ujlmHB5r+cFWjIbSRrF1HziUm+qEh0gpF1UlJB4Ng51fU/SE+QksMukobcmjh9ftOxJmtgxzWPIW3R60=",
      "sm3_hash": "e3620a36a6c17a8e6e7dc58ee1c3c1cb2a1662be9e42817bc55403b4477121e7",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-a17bfbbee26c00ec1c1ef6676596481c",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-35258559d78ef48cf12fb3644367f15e",
      "updated_at": "2026-10-06 14:34:00.229",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20261006-05b66e",
      "created_at": "2026-10-06 14:34:00.211",
      "cross_tx_id": "CX-6ede63c66409",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "81369eb4095a5ba8edbca706cf5cc526c8ade3513b491801ba73e682d3884323",
      "latency_ms": 6,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-a1aa748debc61612f69f5dcb7a283aa0",
      "reg_record_id": "REGREC-6aca47a76408",
      "reg_relay_tx_id": "CHAINMAKER-b0c26f5474ebd879fba1923e1869a2e2",
      "retry_of": "",
      "signature": "MGYEIHeML/D2lt8zFU6OnT8slj1qnhKShSoqWQjmNVNraND+A0IABKTwaJ9uhMrL0SGaoHjUrLLtbbBG4Bq+/rowEwrPc7zzMxz3D+ncN/FQerjIo8St59luWelQLnFnEgejchCc2yM=",
      "sm3_hash": "0de0ce36c3c5330b2cc129f5b15ea294fd2baa2838847391ced3d506e188a069",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-78a7dac9a104abbd97e10d92166124cb",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-3b1c105b6e9bab5f4e48aaee997d0f76",
      "updated_at": "2026-10-06 14:34:00.218",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-10-06 14:34:00.184",
      "cross_tx_id": "CX-1ae5036a0851",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 5,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-5adb544241a36d9f7455aea4ec2fd9dc",
      "reg_record_id": "REGREC-b527fb494e6c",
      "reg_relay_tx_id": "CHAINMAKER-53c0e7a4af9603313f876569132a9d5b",
      "retry_of": "",
      "signature": "MGYEIDUnjtlqCMJ4e+0hjdcuHxYSxfyhTxm6hk+hGwAysFyAA0IABB33IUVIi9AcwwG0bk+sZseHADqb4feGdPtIndOUz8uBH6jMjPinB0Qf3bbEmoEGhzhek02E/wzef0TUMz2wN+4=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-04af80fd745a45ae7791eef4c4d6d0d0",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-10-06 14:34:00.190",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.328",
   "trace_id": "TRACE-20261006-cc21e4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.364",
   "trace_id": "TRACE-20261006-254ac0"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-26735260ab85"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-06 14:34:00.319",
    "cross_tx_id": "CX-26735260ab85",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 6,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-b8cd1455dc852ce911b8f7103b7e28c2",
    "reg_record_id": "REGREC-380f0522e1ac",
    "reg_relay_tx_id": "CHAINMAKER-f091bd3a14a9500f45825ed0fcb8dfcc",
    "retry_of": "",
    "signature": "MGYEICi8E0JKE5+tdGmvb43bNvvuHwZSfjQNTSBs9YbYHQSmA0IABKb9A9K39p+Z53w2jYhdr6Wz4oeU4PBQRIMeBBZz62OFecKSIF6OIkYKPI3F9VWMWCw3XS0JNlrU2zEUQ1aViRA=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-fd1d1f6f38bd8ee3be2b1807f38b5d7f",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-06 14:34:00.326",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.327",
   "trace_id": "TRACE-20261006-46019e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-10-06 14:34:00.364",
   "trace_id": "TRACE-20261006-7ac6ff"
  }
 },
 {
  "path": "/api/crosschain/send",
  "tag": "跨链网关",
  "summary": "跨链消息发送（SM9 验签→源链→监管链双写→目标链；缺签名则代签）",
  "operationId": "crosschainSend",
  "req": {
   "business_id": "UAV-A-001",
   "final_target_chain": "chainmaker",
   "message_type": "UAV_REGISTER_PROOF",
   "payload": {
    "manufacturer_id": "Manufacturer-B",
    "operator_id": "Operator-A",
    "serial_no": "SN-A001",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "uav_id": "UAV-A-001"
   },
   "sm9_identity": "SM9-ID-UAV-A-001",
   "source_chain": "fabric"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-06 14:34:00.319",
    "cross_tx_id": "CX-26735260ab85",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 6,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-b8cd1455dc852ce911b8f7103b7e28c2",
    "reg_record_id": "REGREC-380f0522e1ac",
    "reg_relay_tx_id": "CHAINMAKER-f091bd3a14a9500f45825ed0fcb8dfcc",
    "retry_of": "",
    "signature": "MGYEICi8E0JKE5+tdGmvb43bNvvuHwZSfjQNTSBs9YbYHQSmA0IABKb9A9K39p+Z53w2jYhdr6Wz4oeU4PBQRIMeBBZz62OFecKSIF6OIkYKPI3F9VWMWCw3XS0JNlrU2zEUQ1aViRA=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-fd1d1f6f38bd8ee3be2b1807f38b5d7f",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-06 14:34:00.326",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.326",
   "trace_id": "TRACE-20261006-35c37a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-10-06 14:34:00.363",
   "trace_id": "TRACE-20261006-e04957"
  }
 },
 {
  "path": "/api/dashboard/summary",
  "tag": "驾驶舱",
  "summary": "监管驾驶舱汇总（任务/许可/告警/授权/网络）",
  "operationId": "dashboardSummary",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "alerts": {
     "archived": 0,
     "by_type": {
      "ROUTE_DEVIATION": 1
     },
     "high_open": 1,
     "identified": 1,
     "open": 0,
     "resolved": 0,
     "reviewed": 0,
     "total": 1,
     "traced": 0
    },
    "authorizations": {
     "authorized": 1,
     "denied": 0,
     "expired": 0,
     "pending": 0,
     "total": 1
    },
    "generated_at": "2026-10-06 14:34:00.329",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-06 14:34:00.292",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-06 14:34:00.295"
     }
    ],
    "sessions": {
     "active": 0,
     "authenticated": 0,
     "closed": 1,
     "degraded": 0,
     "init": 0,
     "recovered": 0,
     "total": 1
    },
    "wormhole_events": {
     "detect": 0,
     "isolate": 0,
     "recover": 0,
     "total": 0
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.330",
   "trace_id": "TRACE-20261006-75135d"
  },
  "err": {
   "code": 0,
   "data": {
    "alerts": {
     "archived": 0,
     "by_type": {},
     "high_open": 0,
     "identified": 0,
     "open": 0,
     "resolved": 0,
     "reviewed": 0,
     "total": 0,
     "traced": 0
    },
    "authorizations": {
     "authorized": 0,
     "denied": 0,
     "expired": 0,
     "pending": 0,
     "total": 0
    },
    "generated_at": "2026-10-06 14:34:00.364",
    "recent_alerts": [],
    "sessions": {
     "active": 0,
     "authenticated": 0,
     "closed": 0,
     "degraded": 0,
     "init": 0,
     "recovered": 0,
     "total": 0
    },
    "wormhole_events": {
     "detect": 0,
     "isolate": 0,
     "recover": 0,
     "total": 0
    }
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.366",
   "trace_id": "TRACE-20261006-45d267"
  }
 },
 {
  "path": "/api/experiment/export",
  "tag": "实验",
  "summary": "实验结果 CSV 导出",
  "operationId": "experimentExport",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20261006-d00857,RUN-bdb460d56ecc,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-10-06 14:34:00.333,2026-10-06 14:34:00.333\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.336",
   "trace_id": "TRACE-20261006-6bf81a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.367",
   "trace_id": "TRACE-20261006-d70554"
  }
 },
 {
  "path": "/api/experiment/list",
  "tag": "实验",
  "summary": "实验列表（分页）",
  "operationId": "experimentList",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "avg_latency_ms": 0,
      "completed_at": "2026-10-06 14:34:00.333",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20261006-d00857",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-bdb460d56ecc",
      "scenario": "",
      "started_at": "2026-10-06 14:34:00.333",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.335",
   "trace_id": "TRACE-20261006-f443ea"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-06 14:34:00.367",
   "trace_id": "TRACE-20261006-15ad89"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-bdb460d56ecc"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-06 14:34:00.333",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261006-d00857",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-bdb460d56ecc",
    "scenario": "",
    "started_at": "2026-10-06 14:34:00.333",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.334",
   "trace_id": "TRACE-20261006-d85bfe"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-10-06 14:34:00.367",
   "trace_id": "TRACE-20261006-59aada"
  }
 },
 {
  "path": "/api/experiment/run",
  "tag": "实验",
  "summary": "运行实验（11 类：跨链回路/完整性/验签/冲突/消息流三场景/风险扫描/压力/批量追踪/授权核验/告警批量）",
  "operationId": "experimentRun",
  "req": {
   "count": 5,
   "experiment_type": "SM3_INTEGRITY"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-06 14:34:00.333",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261006-d00857",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-bdb460d56ecc",
    "scenario": "",
    "started_at": "2026-10-06 14:34:00.333",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-06 14:34:00.333",
   "trace_id": "TRACE-20261006-03ba69"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-10-06 14:34:00.366",
   "trace_id": "TRACE-20261006-c8e28b"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "UOM登记", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "遥测", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验"];
