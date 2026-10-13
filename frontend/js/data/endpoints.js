// 由 docs/apifox/skytrust-backend.openapi.json 生成（73 端点全量，含录制样例）。
// 请勿手改：重新生成命令 ./scripts/gen-endpoints.sh。
window.ENDPOINTS = [
 {
  "path": "/api/chain/status",
  "tag": "基础",
  "summary": "四链状态（fabric/chainmaker/fisco-bcos/irita 全 ONLINE）",
  "operationId": "chainStatus",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE",
     "irita": "ONLINE"
    },
    "count": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.970",
   "trace_id": "TRACE-20261013-e75ee8"
  },
  "err": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE",
     "irita": "ONLINE"
    },
    "count": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.073",
   "trace_id": "TRACE-20261013-5adadf"
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
     "fisco-bcos": "ONLINE",
     "irita": "ONLINE"
    },
    "database": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.970",
   "trace_id": "TRACE-20261013-6dd0c7"
  },
  "err": {
   "code": 0,
   "data": {
    "chains": {
     "chainmaker": "ONLINE",
     "fabric": "ONLINE",
     "fisco-bcos": "ONLINE",
     "irita": "ONLINE"
    },
    "database": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.073",
   "trace_id": "TRACE-20261013-7eda54"
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
   "timestamp": "2026-10-13 16:27:00.970",
   "trace_id": "TRACE-20261013-6ed727"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.073",
   "trace_id": "TRACE-20261013-8e03ad"
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
   "timestamp": "2026-10-13 16:27:00.971",
   "trace_id": "TRACE-20261013-fe18b2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-10-13 16:27:01.073",
   "trace_id": "TRACE-20261013-02b18f"
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
   "timestamp": "2026-10-13 16:27:00.971",
   "trace_id": "TRACE-20261013-1eb7a3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-10-13 16:27:01.074",
   "trace_id": "TRACE-20261013-28dd85"
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
    "signature": "MGYEIBMnhY4/QPRZs/3fEdKqtxPZ9frGdVzXp2fhfp09LiosA0IABAS+QYdIQyXVLnmjSm8SEa8FJkFN19S4tUckX4C6cfeLUzjyA32w9aWCRYH64F5Lz0E8ACDswX49XNRTPxMKloU=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.971",
   "trace_id": "TRACE-20261013-c84a81"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-10-13 16:27:01.074",
   "trace_id": "TRACE-20261013-448752"
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
   "timestamp": "2026-10-13 16:27:00.971",
   "trace_id": "TRACE-20261013-5a0aff"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-10-13 16:27:01.074",
   "trace_id": "TRACE-20261013-373a55"
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
   "timestamp": "2026-10-13 16:27:00.973",
   "trace_id": "TRACE-20261013-b9f5f1"
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
   "timestamp": "2026-10-13 16:27:01.079",
   "trace_id": "TRACE-20261013-1fd41d"
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
    "reset_at": "2026-10-13 16:27:01.072",
    "started_at": "2026-10-13 16:27:01.072",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.072",
   "trace_id": "TRACE-20261013-35c5f7"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-13 16:27:01.094",
    "started_at": "2026-10-13 16:27:01.094",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.094",
   "trace_id": "TRACE-20261013-199661"
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
      "created_at": "2026-10-13 16:27:00.960",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.960"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-10-13 16:27:00.960",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.960"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-10-13 16:27:00.961",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "adapter_type": "",
      "created_at": "2026-10-13 16:27:00.973",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.973"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.974",
   "trace_id": "TRACE-20261013-dbb34f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.079",
   "trace_id": "TRACE-20261013-fc1986"
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
    "created_at": "2026-10-13 16:27:00.973",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 16:27:00.973"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.973",
   "trace_id": "TRACE-20261013-5c753b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-10-13 16:27:01.079",
   "trace_id": "TRACE-20261013-f2a5b5"
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
      "created_at": "2026-10-13 16:27:00.961",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-10-13 16:27:00.961",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-10-13 16:27:00.961",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-10-13 16:27:00.974",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 16:27:00.974"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.975",
   "trace_id": "TRACE-20261013-974dcc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-7394f0"
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
    "created_at": "2026-10-13 16:27:00.974",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 16:27:00.974"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.974",
   "trace_id": "TRACE-20261013-530f93"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-a7d6a8"
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
    "created_at": "2026-10-13 16:27:00.975",
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
   "timestamp": "2026-10-13 16:27:00.976",
   "trace_id": "TRACE-20261013-36efbb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-c98751"
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
      "created_at": "2026-10-13 16:27:00.968",
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
      "created_at": "2026-10-13 16:27:00.968",
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
      "created_at": "2026-10-13 16:27:00.968",
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
      "created_at": "2026-10-13 16:27:00.968",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.975",
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
   "timestamp": "2026-10-13 16:27:00.976",
   "trace_id": "TRACE-20261013-025317"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-ee9f2f"
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
     "created_at": "2026-10-13 16:27:00.978",
     "expires_at": "2028-10-13 16:27:00.978",
     "id_number": "420100199001010011",
     "issued_at": "2026-10-13 16:27:00.978",
     "license_id": "PIL-de68906396d7",
     "license_no": "UAV-PILOT-2026-9420",
     "name": "文档样例操控员",
     "signature": "MGYEIFdBr7po7n7hBD8Bm3rWz0LD0aY7sZRROnYG3ogZ24VwA0IABGcVV4T2LVjD5eoQKUCZJyxc2c857huS6Db+lcOUCENiItzYdtwKO/L9E+6mg6Bheu+7KDQEWHrYf9XiIQuulK8=",
     "status": "ISSUED",
     "updated_at": "2026-10-13 16:27:00.978"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.978",
   "trace_id": "TRACE-20261013-2e6424"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotApplyReq",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-da8d13"
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
      "created_at": "2026-10-13 16:27:00.978",
      "expires_at": "2028-10-13 16:27:00.978",
      "id_number": "420100199001010011",
      "issued_at": "2026-10-13 16:27:00.978",
      "license_id": "PIL-de68906396d7",
      "license_no": "UAV-PILOT-2026-9420",
      "name": "文档样例操控员",
      "signature": "MGYEIFdBr7po7n7hBD8Bm3rWz0LD0aY7sZRROnYG3ogZ24VwA0IABGcVV4T2LVjD5eoQKUCZJyxc2c857huS6Db+lcOUCENiItzYdtwKO/L9E+6mg6Bheu+7KDQEWHrYf9XiIQuulK8=",
      "status": "ISSUED",
      "updated_at": "2026-10-13 16:27:00.978"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.979",
   "trace_id": "TRACE-20261013-c5ac21"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-eb416b"
  }
 },
 {
  "path": "/api/pilot/query",
  "tag": "UOM登记",
  "summary": "执照查询（不存在→7002）",
  "operationId": "pilotQuery",
  "req": {
   "license_id": "PIL-de68906396d7"
  },
  "resp": {
   "code": 0,
   "data": {
    "category": "多旋翼",
    "created_at": "2026-10-13 16:27:00.978",
    "expires_at": "2028-10-13 16:27:00.978",
    "id_number": "420100199001010011",
    "issued_at": "2026-10-13 16:27:00.978",
    "license_id": "PIL-de68906396d7",
    "license_no": "UAV-PILOT-2026-9420",
    "name": "文档样例操控员",
    "signature": "MGYEIFdBr7po7n7hBD8Bm3rWz0LD0aY7sZRROnYG3ogZ24VwA0IABGcVV4T2LVjD5eoQKUCZJyxc2c857huS6Db+lcOUCENiItzYdtwKO/L9E+6mg6Bheu+7KDQEWHrYf9XiIQuulK8=",
    "status": "ISSUED",
    "updated_at": "2026-10-13 16:27:00.978"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.979",
   "trace_id": "TRACE-20261013-219b5b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotQueryReq",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-0126e7"
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
      "created_at": "2026-10-13 16:27:00.977",
      "id_number": "91420100DOCAIR01X",
      "name": "文档样例物流企业",
      "status": "REGISTERED",
      "subject_id": "RNS-d5eb2d0a73a3",
      "subject_type": "ENTERPRISE",
      "updated_at": "2026-10-13 16:27:00.977"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.977",
   "trace_id": "TRACE-20261013-821917"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-0323a8"
  }
 },
 {
  "path": "/api/realname/query",
  "tag": "UOM登记",
  "summary": "实名主体查询（不存在→7001）",
  "operationId": "realnameQuery",
  "req": {
   "subject_id": "RNS-d5eb2d0a73a3"
  },
  "resp": {
   "code": 0,
   "data": {
    "contact": "027-88880001",
    "created_at": "2026-10-13 16:27:00.977",
    "id_number": "91420100DOCAIR01X",
    "name": "文档样例物流企业",
    "status": "REGISTERED",
    "subject_id": "RNS-d5eb2d0a73a3",
    "subject_type": "ENTERPRISE",
    "updated_at": "2026-10-13 16:27:00.977"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.978",
   "trace_id": "TRACE-20261013-74ed4a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameQueryReq",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-68ca23"
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
     "created_at": "2026-10-13 16:27:00.977",
     "id_number": "91420100DOCAIR01X",
     "name": "文档样例物流企业",
     "status": "REGISTERED",
     "subject_id": "RNS-d5eb2d0a73a3",
     "subject_type": "ENTERPRISE",
     "updated_at": "2026-10-13 16:27:00.977"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.977",
   "trace_id": "TRACE-20261013-de4974"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameRegisterReq",
   "timestamp": "2026-10-13 16:27:01.080",
   "trace_id": "TRACE-20261013-a9c039"
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
      "created_at": "2026-10-13 16:27:00.961",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260001",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "created_at": "2026-10-13 16:27:00.961",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260002",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "created_at": "2026-10-13 16:27:00.961",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260003",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "created_at": "2026-10-13 16:27:00.961",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260004",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-10-13 16:27:00.961"
     },
     {
      "created_at": "2026-10-13 16:27:00.962",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260005",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-10-13 16:27:00.962"
     },
     {
      "created_at": "2026-10-13 16:27:00.962",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260006",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-10-13 16:27:00.962"
     },
     {
      "created_at": "2026-10-13 16:27:00.962",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260007",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-10-13 16:27:00.962"
     },
     {
      "created_at": "2026-10-13 16:27:00.980",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "realname_id": "RNS-d5eb2d0a73a3",
      "registration_mark": "UAS-59320286",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-10-13 16:27:00.984"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.986",
   "trace_id": "TRACE-20261013-f78ac2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-7f46a9"
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
    "created_at": "2026-10-13 16:27:00.980",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-d5eb2d0a73a3",
    "registration_mark": "UAS-59320286",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 16:27:00.984"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.985",
   "trace_id": "TRACE-20261013-ba5ce1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-bae944"
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
   "realname_id": "RNS-d5eb2d0a73a3",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-10-13 16:27:00.981",
     "cross_tx_id": "CX-c84decb13aae",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 3,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-8b669ead8dc7fa20933a942438bc8ba2",
     "reg_record_id": "REGREC-dcf1444d2864",
     "reg_relay_tx_id": "CHAINMAKER-12098ed82e821c1552e40492da16c642",
     "retry_of": "",
     "signature": "MGYEIEkE6CKq8rS44faqMDN3T/oKsl0DHodWDlmYOspShcRWA0IABLJq8jqgFu5T8N6krpyTJM7tPmj6zC9Pugx7oR/Vgyy+kBiJ7P+AvXZU1yvyXWKhyUmAZ0Sl2/zpBFMoLNcR+8I=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-d8a0fe29b4904ecdc953319a676401ce",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-10-13 16:27:00.984",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-10-13 16:27:00.980",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-d5eb2d0a73a3",
     "registration_mark": "UAS-59320286",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 16:27:00.984"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.985",
   "trace_id": "TRACE-20261013-2a0c6b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-10-13 16:27:01.081",
   "trace_id": "TRACE-20261013-8992b9"
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
    "created_at": "2026-10-13 16:27:00.980",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-d5eb2d0a73a3",
    "registration_mark": "UAS-59320286",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 16:27:00.987"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.988",
   "trace_id": "TRACE-20261013-812f43"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-cd304f"
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
     "created_at": "2026-10-13 16:27:00.980",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-d5eb2d0a73a3",
     "registration_mark": "UAS-59320286",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 16:27:00.986"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.986",
   "trace_id": "TRACE-20261013-914777"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-b3fdef"
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
    "created_at": "2026-10-13 16:27:00.992",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIGx3mmyxi9LoSGvj4NTmOLpGejcpnqTP4Pmh6LQv+/pjA0IABHUpAV1QIzRH/YzIKKxeEW/btxs1wCQUuZhkgtOOdTvTYHxRMZkpP+FzwIAMShrh2jU+kepOEHa/Qm/9JA/eBzs=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 16:27:00.992",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.993",
   "trace_id": "TRACE-20261013-c26ea9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-fb0240"
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
      "created_at": "2026-10-13 16:27:00.992",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "pilot_license_id": "",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIGx3mmyxi9LoSGvj4NTmOLpGejcpnqTP4Pmh6LQv+/pjA0IABHUpAV1QIzRH/YzIKKxeEW/btxs1wCQUuZhkgtOOdTvTYHxRMZkpP+FzwIAMShrh2jU+kepOEHa/Qm/9JA/eBzs=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 16:27:00.992",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.994",
   "trace_id": "TRACE-20261013-b28f80"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-ae4d44"
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
    "created_at": "2026-10-13 16:27:00.992",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIGx3mmyxi9LoSGvj4NTmOLpGejcpnqTP4Pmh6LQv+/pjA0IABHUpAV1QIzRH/YzIKKxeEW/btxs1wCQUuZhkgtOOdTvTYHxRMZkpP+FzwIAMShrh2jU+kepOEHa/Qm/9JA/eBzs=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 16:27:00.992",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.993",
   "trace_id": "TRACE-20261013-9827de"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-f228b2"
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
     "application_id": "APP-20261013-b21531",
     "created_at": "2026-10-13 16:27:00.995",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEIHHP3eLrlfAlXck2AivO5cDW8OXABOJxXeUOCRrAv8HKA0IABFUohH++lxv89A6jtebAVMyvY5MUkA2c3yEuDqkbVaKvPfgK1MNFEzucZAiwAvazhpAdVOatZ9EnRTzuw0SiIkk=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-0023d194ee1811a8fa9803b07cdd69dd",
     "status": "RELAYED",
     "updated_at": "2026-10-13 16:27:00.999"
    },
    "crosschain": {
     "business_id": "APP-20261013-b21531",
     "created_at": "2026-10-13 16:27:00.996",
     "cross_tx_id": "CX-efd2c0599850",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "2f41f0d1e58acee79ce068f008896b12bb236e1cf4bfda8ef930b0624da16c42",
     "latency_ms": 3,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-ed2fa92be828160e08befae7ceb42ae7",
     "reg_record_id": "REGREC-e623b89e3410",
     "reg_relay_tx_id": "CHAINMAKER-f06d548ccc2ebfbe12ec54d653003084",
     "retry_of": "",
     "signature": "MGYEIFTAModvBn9w+RG/Wkms+qWsiEJaoy/JAw99FdkHDUNAA0IABIEaGf+2Gbpm5rYRny8MeAB7Eyzg3aWi4bGaGzH+LfvbhjEOvvWWhU3Bls+dMnTLQ1YT0CqDI8mbpbrLm5D7l4Y=",
     "sm3_hash": "09ca31cf928d5db9ccec26e8da53a2d055013bd3862467e8744f8cde54bd31b7",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-0023d194ee1811a8fa9803b07cdd69dd",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-9c45f6d77f71750178c674f68f93e89d",
     "updated_at": "2026-10-13 16:27:00.999",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:00.999",
   "trace_id": "TRACE-20261013-ebbf20"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-5f2bf6"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20261013-b21531"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20261013-b21531",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-775bff78817f",
      "review_time": "2026-10-13 16:27:01.000",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.007",
   "trace_id": "TRACE-20261013-cf2ece"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-d5dff4"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20261013-b21531",
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
     "business_id": "REV-775bff78817f",
     "created_at": "2026-10-13 16:27:01.001",
     "cross_tx_id": "CX-4d7c101d5c96",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "2e0722b21c8ddac2c3241c2892338d98fef4aab2db93ccffb058c27f3d0380c4",
     "latency_ms": 4,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-5b0ad503f11fd97d941bbef96008e5dc",
     "reg_record_id": "REGREC-7507ee0c2177",
     "reg_relay_tx_id": "CHAINMAKER-865c1e236e9a90a218c254cb7e545da6",
     "retry_of": "",
     "signature": "MGYEIGjTR8LavQZW7K4T7ZhNE2MBodBEGTCldM/IwFy3RR0fA0IABDHvgRKCjfHiniMpkbfZvcHDZvCy5rc6c/5YLSHjiqfXnxfdUKebEnazwzmvz2Nir3Vt2jNnBIS3yD7CDMa1v7k=",
     "sm3_hash": "395c92b9b8b2faef11312bc9cd5db17bb510dd2f174b5bfc610684c4a44c8d30",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-f1c4783ade8093ece8e076899fd5106a",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-19d98e1d19c631903c99bbb272585b7c",
     "updated_at": "2026-10-13 16:27:01.005",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 16:27:00.992",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIGx3mmyxi9LoSGvj4NTmOLpGejcpnqTP4Pmh6LQv+/pjA0IABHUpAV1QIzRH/YzIKKxeEW/btxs1wCQUuZhkgtOOdTvTYHxRMZkpP+FzwIAMShrh2jU+kepOEHa/Qm/9JA/eBzs=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 16:27:01.005",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20261013-b21531",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-775bff78817f",
     "review_time": "2026-10-13 16:27:01.000",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.007",
   "trace_id": "TRACE-20261013-f0e769"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-10-13 16:27:01.082",
   "trace_id": "TRACE-20261013-e15b63"
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
   "timestamp": "2026-10-13 16:27:01.008",
   "trace_id": "TRACE-20261013-41f5a3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-03e0b8"
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
   "timestamp": "2026-10-13 16:27:01.008",
   "trace_id": "TRACE-20261013-a698bc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-6cadc7"
  }
 },
 {
  "path": "/api/pass/issue",
  "tag": "通行许可",
  "summary": "飞行许可签发（FLIGHT_PASS 证照→监管→运营）",
  "operationId": "passIssue",
  "req": {
   "issuer": "REGISTRY-ADMIN",
   "mission_id": "MISSION-2026-001",
   "pass_id": "PASS-2026-001",
   "valid_from": "2026-10-13 15:27:00.960",
   "valid_to": "2026-10-13 17:27:00.960"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-13 16:27:01.012",
     "cross_tx_id": "CX-c30ba90d0bc6",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 3,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-3738a3d274976f3fe837956a10f99acb",
     "reg_record_id": "REGREC-3505535ecc31",
     "reg_relay_tx_id": "CHAINMAKER-8e451df4ec9c430534ce87317b41b79c",
     "retry_of": "",
     "signature": "MGYEIBETLlHX/rED51hphH9KV0bhEbWYu5uK6BdT3XMHYU0EA0IABFKf11USsABTwbAdup3qHbuVgqV9xYg5MhDtRkwKP958I0xhr04C2QYy5tb5tJITqrY2YXs8vlmMZbo2x//ALO0=",
     "sm3_hash": "00a44f288128c04712564533edf0206746af7acd8a51fbc9b43810b455bf3839",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-e1f7448824e6b110d556a17f7ddccb4d",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-7578f55d0615359bfcae79f1f0269b49",
     "updated_at": "2026-10-13 16:27:01.015",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-10-13 16:27:01.010",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIJE0Si0RsJC7nckAS4jFSdPzRtBX5+9w+iS2Ga93MOhKA0IABI2fztMhQMVhJrIPK8+wMp089//xB8/KbQo3AGPB5iJIOwUmWeQD9NK7Vyo5MXsf+6mmnwiQlPUI7cZ5LT8MSXU=",
     "sm3_hash": "99f2c0002ec52f3545e028c271ff1df608079802dd8794c8538a5476e8472808",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 16:27:01.015",
     "valid_from": "2026-10-13 15:27:00.960",
     "valid_to": "2026-10-13 17:27:00.960"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.016",
   "trace_id": "TRACE-20261013-0be5d6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-191b20"
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
      "created_at": "2026-10-13 16:27:01.010",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIJE0Si0RsJC7nckAS4jFSdPzRtBX5+9w+iS2Ga93MOhKA0IABI2fztMhQMVhJrIPK8+wMp089//xB8/KbQo3AGPB5iJIOwUmWeQD9NK7Vyo5MXsf+6mmnwiQlPUI7cZ5LT8MSXU=",
      "sm3_hash": "99f2c0002ec52f3545e028c271ff1df608079802dd8794c8538a5476e8472808",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 16:27:01.015",
      "valid_from": "2026-10-13 15:27:00.960",
      "valid_to": "2026-10-13 17:27:00.960"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.017",
   "trace_id": "TRACE-20261013-a7094b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-d51940"
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
    "created_at": "2026-10-13 16:27:01.010",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIJE0Si0RsJC7nckAS4jFSdPzRtBX5+9w+iS2Ga93MOhKA0IABI2fztMhQMVhJrIPK8+wMp089//xB8/KbQo3AGPB5iJIOwUmWeQD9NK7Vyo5MXsf+6mmnwiQlPUI7cZ5LT8MSXU=",
    "sm3_hash": "99f2c0002ec52f3545e028c271ff1df608079802dd8794c8538a5476e8472808",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 16:27:01.015",
    "valid_from": "2026-10-13 15:27:00.960",
    "valid_to": "2026-10-13 17:27:00.960"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.016",
   "trace_id": "TRACE-20261013-187e42"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-49a168"
  }
 },
 {
  "path": "/api/pass/revoke",
  "tag": "通行许可",
  "summary": "许可吊销（PASS_REVOKE 跨链重发）",
  "operationId": "passRevoke",
  "req": {
   "operator": "REGISTRY-ADMIN",
   "pass_id": "PASS-2026-001",
   "reason": "任务结束"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-13 16:27:01.020",
     "cross_tx_id": "CX-0bfdf4a7f507",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 2,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-081dfd4df738364bd7c63894eb215b43",
     "reg_record_id": "REGREC-06fecba4066b",
     "reg_relay_tx_id": "CHAINMAKER-adc7498647023eeccfa7458b2649b18a",
     "retry_of": "",
     "signature": "MGYEIKfioQwKoRGaJHNR/3Iky/czhfu1c48oaUrRAKhwhlOgA0IABGfQ2pX9dh2/NJewf91xUc7gcxbA2ui+gZJcrGzmypcNka3gQIYGn9y0UaLkujEbZXOkbl/9ap5H1QP9xWMxM5E=",
     "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-55a84d9eb2521d7ebef2c9c60621d534",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
     "updated_at": "2026-10-13 16:27:01.022",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-10-13 16:27:01.010",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIJE0Si0RsJC7nckAS4jFSdPzRtBX5+9w+iS2Ga93MOhKA0IABI2fztMhQMVhJrIPK8+wMp089//xB8/KbQo3AGPB5iJIOwUmWeQD9NK7Vyo5MXsf+6mmnwiQlPUI7cZ5LT8MSXU=",
     "sm3_hash": "99f2c0002ec52f3545e028c271ff1df608079802dd8794c8538a5476e8472808",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 16:27:01.018",
     "valid_from": "2026-10-13 15:27:00.960",
     "valid_to": "2026-10-13 17:27:00.960"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.023",
   "trace_id": "TRACE-20261013-c3bc81"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-10-13 16:27:01.084",
   "trace_id": "TRACE-20261013-85aa1c"
  }
 },
 {
  "path": "/api/pass/verify",
  "tag": "通行许可",
  "summary": "许可验证（valid/reasons/status；SM9 双身份兼容验签——迁移前 FISCO-ADMIN 签名存量证照不断代；吊销后 valid=false）",
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
   "timestamp": "2026-10-13 16:27:01.018",
   "trace_id": "TRACE-20261013-c46288"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 16:27:01.083",
   "trace_id": "TRACE-20261013-9d9622"
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:01.024",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
   "timestamp": "2026-10-13 16:27:01.024",
   "trace_id": "TRACE-20261013-c9046c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.085",
   "trace_id": "TRACE-20261013-053fab"
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
    "created_at": "2026-10-13 16:27:01.024",
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
   "timestamp": "2026-10-13 16:27:01.024",
   "trace_id": "TRACE-20261013-9d573c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-10-13 16:27:01.085",
   "trace_id": "TRACE-20261013-f69c57"
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
      "created_at": "2026-10-13 16:27:00.969",
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
   "timestamp": "2026-10-13 16:27:01.023",
   "trace_id": "TRACE-20261013-93aad9"
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
      "created_at": "2026-10-13 16:27:01.078",
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
      "created_at": "2026-10-13 16:27:01.077",
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
      "created_at": "2026-10-13 16:27:01.077",
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
      "created_at": "2026-10-13 16:27:01.078",
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
      "created_at": "2026-10-13 16:27:01.078",
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
      "created_at": "2026-10-13 16:27:01.078",
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
      "created_at": "2026-10-13 16:27:01.078",
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
      "created_at": "2026-10-13 16:27:01.077",
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
   "timestamp": "2026-10-13 16:27:01.084",
   "trace_id": "TRACE-20261013-d2a8a9"
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
   "session_id": "SESS-2884037e6405"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-13 16:27:01.026",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-2884037e6405",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 16:27:01.033"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.033",
   "trace_id": "TRACE-20261013-cc877a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-10-13 16:27:01.088",
   "trace_id": "TRACE-20261013-231ca2"
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
      "created_at": "2026-10-13 16:27:01.026",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-2884037e6405",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 16:27:01.026"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.026",
   "trace_id": "TRACE-20261013-9dc251"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.086",
   "trace_id": "TRACE-20261013-358fa7"
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
     "nonce": "NONCE-5a79980aafd4b725044691dde952189f",
     "signature": "MGYEIFoNBX1Ix9U21EHnZTqiV4MynPUk8CgBl/2O3fnlkEN0A0IABHbgFcnq8fzPDgzYmAxhrldovn3PmIbi8B7hpWeFF+5QeaBCc/6BF63AYQLYUP4hJ9mIOT/pm5wxk+tvlhl17as=",
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
     "created_at": "2026-10-13 16:27:01.026",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-2884037e6405",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 16:27:01.026"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.026",
   "trace_id": "TRACE-20261013-03ed55"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-10-13 16:27:01.085",
   "trace_id": "TRACE-20261013-a02fba"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-2884037e6405"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-13 16:27:01.028",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIAKSClHyBJPhPufpw29QS7fcANSzCAcFqm6dl87Rqr/ZA0IABHIPvbetvQZQOpr36UgEO2Ms2lqQZYM/8XneWQ9A8ivskh0DhhKzXfg+Wychq4VjeyvbMw0EepXUQX03jHIGeEA=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-a3ea7ecd0218a568",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-2884037e6405",
      "sm3_hash": "312cc3c885162abebee8d40c74ef490a333c13e25c85dca5d723d110b4a96d8b",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-10-13 16:27:01.027"
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
   "timestamp": "2026-10-13 16:27:01.028",
   "trace_id": "TRACE-20261013-a9f665"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.086",
   "trace_id": "TRACE-20261013-cc441f"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-2884037e6405",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-10-13 16:27:01.028",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIAKSClHyBJPhPufpw29QS7fcANSzCAcFqm6dl87Rqr/ZA0IABHIPvbetvQZQOpr36UgEO2Ms2lqQZYM/8XneWQ9A8ivskh0DhhKzXfg+Wychq4VjeyvbMw0EepXUQX03jHIGeEA=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-a3ea7ecd0218a568",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-2884037e6405",
     "sm3_hash": "312cc3c885162abebee8d40c74ef490a333c13e25c85dca5d723d110b4a96d8b",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-10-13 16:27:01.027"
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
   "timestamp": "2026-10-13 16:27:01.028",
   "trace_id": "TRACE-20261013-427ad0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-10-13 16:27:01.086",
   "trace_id": "TRACE-20261013-e2c802"
  }
 },
 {
  "path": "/api/telemetry/latest",
  "tag": "遥测",
  "summary": "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）",
  "operationId": "telemetryLatest",
  "req": {
   "session_id": "SESS-2884037e6405"
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 16:27:01.029",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 16:27:01.029",
     "seq": 1,
     "session_id": "SESS-2884037e6405",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-f564e67362da",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.030",
   "trace_id": "TRACE-20261013-870d3a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.087",
   "trace_id": "TRACE-20261013-469646"
  }
 },
 {
  "path": "/api/telemetry/list",
  "tag": "遥测",
  "summary": "遥测分页列表（session_id/uav_id 过滤）",
  "operationId": "telemetryList",
  "req": {
   "session_id": "SESS-2884037e6405"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alt": 85,
      "created_at": "2026-10-13 16:27:01.029",
      "heading": 45,
      "lat": 30.52,
      "lon": 114.32,
      "mission_id": "",
      "reported_at": "2026-10-13 16:27:01.029",
      "seq": 1,
      "session_id": "SESS-2884037e6405",
      "source": "MANUAL",
      "speed": 12,
      "telemetry_id": "TLM-f564e67362da",
      "uav_id": "UAV-A-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.030",
   "trace_id": "TRACE-20261013-234f83"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.086",
   "trace_id": "TRACE-20261013-ac58b0"
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
   "session_id": "SESS-2884037e6405",
   "speed": 12
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 16:27:01.029",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 16:27:01.029",
     "seq": 1,
     "session_id": "SESS-2884037e6405",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-f564e67362da",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.029",
   "trace_id": "TRACE-20261013-dbe43e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.TelemetryReportRequest",
   "timestamp": "2026-10-13 16:27:01.086",
   "trace_id": "TRACE-20261013-790984"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-2884037e6405"
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
   "timestamp": "2026-10-13 16:27:01.033",
   "trace_id": "TRACE-20261013-cbf600"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.087",
   "trace_id": "TRACE-20261013-88bc56"
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
   "timestamp": "2026-10-13 16:27:01.032",
   "trace_id": "TRACE-20261013-325986"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-10-13 16:27:01.087",
   "trace_id": "TRACE-20261013-393446"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-2884037e6405"
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
   "timestamp": "2026-10-13 16:27:01.032",
   "trace_id": "TRACE-20261013-74514a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-10-13 16:27:01.087",
   "trace_id": "TRACE-20261013-6bbd03"
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
   "timestamp": "2026-10-13 16:27:01.031",
   "trace_id": "TRACE-20261013-da165b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-10-13 16:27:01.087",
   "trace_id": "TRACE-20261013-f10fd5"
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
      "created_at": "2026-10-13 16:27:01.034",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 16:27:01.034"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.035",
   "trace_id": "TRACE-20261013-244aa9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.088",
   "trace_id": "TRACE-20261013-3b7e63"
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
    "created_at": "2026-10-13 16:27:01.034",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 16:27:01.034"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.034",
   "trace_id": "TRACE-20261013-deacc6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-10-13 16:27:01.088",
   "trace_id": "TRACE-20261013-498881"
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
    "created_at": "2026-10-13 16:27:01.034",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 16:27:01.035"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.035",
   "trace_id": "TRACE-20261013-d90f5a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-10-13 16:27:01.089",
   "trace_id": "TRACE-20261013-8ecf46"
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
   "timestamp": "2026-10-13 16:27:01.036",
   "trace_id": "TRACE-20261013-042857"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-10-13 16:27:01.089",
   "trace_id": "TRACE-20261013-e96b64"
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
    "audit_hash": "1b276e5609711a43581794a6fca46fd85548823cd196ab6ca18b1bb07d528dbf",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-10-13 16:27:01.037",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-10-13 16:27:01.037",
    "valid_from": "2026-10-13 16:27:01.037",
    "valid_to": "2026-10-14 16:27:01.037"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.037",
   "trace_id": "TRACE-20261013-510a7c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-10-13 16:27:01.089",
   "trace_id": "TRACE-20261013-b26590"
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
     "audit_hash": "1b276e5609711a43581794a6fca46fd85548823cd196ab6ca18b1bb07d528dbf",
     "audit_id": "AUD-9fbb8c50ec49",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-1d221bf4312d6b356e0a14a6b1d958d3",
     "created_at": "2026-10-13 16:27:01.037",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "1b276e5609711a43581794a6fca46fd85548823cd196ab6ca18b1bb07d528dbf",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-10-13 16:27:01.037",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-10-13 16:27:01.037",
     "valid_from": "2026-10-13 16:27:01.037",
     "valid_to": "2026-10-14 16:27:01.037"
    },
    "chain_tx_id": "CHAINMAKER-1d221bf4312d6b356e0a14a6b1d958d3"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.038",
   "trace_id": "TRACE-20261013-d2990b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-10-13 16:27:01.089",
   "trace_id": "TRACE-20261013-c14cd5"
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
    "chain_tx_id": "CHAINMAKER-a797aa7d5971c81ee0dd8d73ff439333",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 16:27:00.992",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIGx3mmyxi9LoSGvj4NTmOLpGejcpnqTP4Pmh6LQv+/pjA0IABHUpAV1QIzRH/YzIKKxeEW/btxs1wCQUuZhkgtOOdTvTYHxRMZkpP+FzwIAMShrh2jU+kepOEHa/Qm/9JA/eBzs=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 16:27:01.005",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-0e456c476d06",
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
     "audit_hash": "24f65596b8996c7f3f570c9b2c8a244ecbddfe094679d18251f99744ce1faa9b",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.040",
   "trace_id": "TRACE-20261013-d30f71"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-10-13 16:27:01.090",
   "trace_id": "TRACE-20261013-98a06a"
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
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-0e456c476d06,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",24f65596b8996c7f3f570c9b2c8a244ecbddfe094679d18251f99744ce1faa9b,CHAINMAKER-a797aa7d5971c81ee0dd8d73ff439333,2026-10-13 16:27:01.040\nAUD-9fbb8c50ec49,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",1b276e5609711a43581794a6fca46fd85548823cd196ab6ca18b1bb07d528dbf,CHAINMAKER-1d221bf4312d6b356e0a14a6b1d958d3,2026-10-13 16:27:01.037\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.042",
   "trace_id": "TRACE-20261013-d5f020"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.090",
   "trace_id": "TRACE-20261013-6fcc8b"
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
      "audit_hash": "24f65596b8996c7f3f570c9b2c8a244ecbddfe094679d18251f99744ce1faa9b",
      "audit_id": "AUD-0e456c476d06",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-a797aa7d5971c81ee0dd8d73ff439333",
      "created_at": "2026-10-13 16:27:01.040",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.041",
   "trace_id": "TRACE-20261013-7f9db2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.090",
   "trace_id": "TRACE-20261013-aaa753"
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
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n77,TRACE-20261013-d30f71,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-a797aa7d5971c81ee0dd8d73ff439333\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-10-13 16:27:01.040\n76,TRACE-20261013-d2990b,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-1d221bf4312d6b356e0a14a6b1d958d3\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-10-13 16:27:01.037\n75,TRACE-20261013-510a7c,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-10-13 16:27:01.037\"\",\"\"valid_to\"\":\"\"2026-10-14 16:27:01.037\"\"}\",2026-10-13 16:27:01.037\n74,TRACE-20261013-042857,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":0,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 16:27:01.036\n73,TRACE-20261013-d90f5a,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-10-13 16:27:01.035\n72,TRACE-20261013-deacc6,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-10-13 16:27:01.034\n71,TRACE-20261013-cc877a,OP-1,SESSION_CLOSE,SESSION,SESS-2884037e6405,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-10-13 16:27:01.033\n70,TRACE-20261013-cc877a,OP-1,STATE_TRANSITION,SESSION,SESS-2884037e6405,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-10-13 16:27:01.033\n69,TRACE-20261013-da165b,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-10-13 16:27:01.031\n68,TRACE-20261013-dbe43e,UAV-A-001,TELEMETRY_REPORT,TELEMETRY,TLM-f564e67362da,\"{\"\"position\"\":[30.52,114.32,85],\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-2884037e6405\"\",\"\"source\"\":\"\"MANUAL\"\"}\",2026-10-13 16:27:01.029\n67,TRACE-20261013-427ad0,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-a3ea7ecd0218a568,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-2884037e6405\"\"}\",2026-10-13 16:27:01.028\n66,TRACE-20261013-03ed55,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-2884037e6405,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 16:27:01.026\n65,TRACE-20261013-03ed55,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-2884037e6405,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-10-13 16:27:01.026\n64,TRACE-20261013-03ed55,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-2884037e6405,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-10-13 16:27:01.026\n63,TRACE-20261013-9d573c,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-10-13 16:27:01.024\n62,TRACE-20261013-c3bc81,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-0bfdf4a7f507,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":2,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-081dfd4df738364bd7c63894eb215b43\"\",\"\"reg_record_id\"\":\"\"REGREC-06fecba4066b\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-adc7498647023eeccfa7458b2649b18a\"\",\"\"source_chain_tx_id\"\":\"\"IRITA-55a84d9eb2521d7ebef2c9c60621d534\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-f940482d4b81d054b0e01f459d0f6664\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-10-13 16:27:01.023\n61,TRACE-20261013-c3bc81,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-0bfdf4a7f507,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20261013-c3bc81\"\"}\",2026-10-13 16:27:01.022\n60,TRACE-20261013-c3bc81,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-0bfdf4a7f507,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-c3bc81\"\"}\",2026-10-13 16:27:01.022\n59,TRACE-20261013-c3bc81,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-0bfdf4a7f507,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-c3bc81\"\"}\",2026-10-13 16:27:01.022\n58,TRACE-20261013-c3bc81,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-0bfdf4a7f507,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-c3bc81\"\"}\",2026-10-13 16:27:01.022\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.043",
   "trace_id": "TRACE-20261013-1c0c21"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.091",
   "trace_id": "TRACE-20261013-0260dc"
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
      "created_at": "2026-10-13 16:27:01.040",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-a797aa7d5971c81ee0dd8d73ff439333\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 77,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20261013-d30f71"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-10-13 16:27:01.037",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-1d221bf4312d6b356e0a14a6b1d958d3\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 76,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-d2990b"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-10-13 16:27:01.037",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-10-13 16:27:01.037\",\"valid_to\":\"2026-10-14 16:27:01.037\"}",
      "id": 75,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-510a7c"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-10-13 16:27:01.036",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":0,\"uav_id\":\"UAV-A-001\"}",
      "id": 74,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20261013-042857"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-10-13 16:27:01.035",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 73,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-d90f5a"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-10-13 16:27:01.034",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 72,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-deacc6"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-10-13 16:27:01.033",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 71,
      "target_id": "SESS-2884037e6405",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-cc877a"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-10-13 16:27:01.033",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 70,
      "target_id": "SESS-2884037e6405",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-cc877a"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-10-13 16:27:01.031",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 69,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-da165b"
     },
     {
      "action": "TELEMETRY_REPORT",
      "actor": "UAV-A-001",
      "created_at": "2026-10-13 16:27:01.029",
      "detail": "{\"position\":[30.52,114.32,85],\"seq\":1,\"session_id\":\"SESS-2884037e6405\",\"source\":\"MANUAL\"}",
      "id": 68,
      "target_id": "TLM-f564e67362da",
      "target_type": "TELEMETRY",
      "trace_id": "TRACE-20261013-dbe43e"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 16:27:01.028",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-2884037e6405\"}",
      "id": 67,
      "target_id": "MSG-a3ea7ecd0218a568",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20261013-427ad0"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 16:27:01.026",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 66,
      "target_id": "SESS-2884037e6405",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-03ed55"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 16:27:01.026",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 65,
      "target_id": "SESS-2884037e6405",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-03ed55"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 16:27:01.026",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 64,
      "target_id": "SESS-2884037e6405",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-03ed55"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-10-13 16:27:01.024",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 63,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-9d573c"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 16:27:01.023",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":2,\"reg_receive_tx_id\":\"CHAINMAKER-081dfd4df738364bd7c63894eb215b43\",\"reg_record_id\":\"REGREC-06fecba4066b\",\"reg_relay_tx_id\":\"CHAINMAKER-adc7498647023eeccfa7458b2649b18a\",\"source_chain_tx_id\":\"IRITA-55a84d9eb2521d7ebef2c9c60621d534\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-f940482d4b81d054b0e01f459d0f6664\",\"verify_result\":\"PASS\"}",
      "id": 62,
      "target_id": "CX-0bfdf4a7f507",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-c3bc81"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 16:27:01.022",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20261013-c3bc81\"}",
      "id": 61,
      "target_id": "CX-0bfdf4a7f507",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-c3bc81"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 16:27:01.022",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20261013-c3bc81\"}",
      "id": 60,
      "target_id": "CX-0bfdf4a7f507",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-c3bc81"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 16:27:01.022",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20261013-c3bc81\"}",
      "id": 59,
      "target_id": "CX-0bfdf4a7f507",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-c3bc81"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 16:27:01.022",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20261013-c3bc81\"}",
      "id": 58,
      "target_id": "CX-0bfdf4a7f507",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-c3bc81"
     }
    ],
    "total": 77
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.042",
   "trace_id": "TRACE-20261013-d6451a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.091",
   "trace_id": "TRACE-20261013-c1d6d2"
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
      "created_at": "2026-10-13 16:27:01.045",
      "cross_tx_id": "CX-0fd833b200c5",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 11,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-1a5d438773cb2e93d034d62ba9e96b54",
      "reg_record_id": "REGREC-8701abd24613",
      "reg_relay_tx_id": "CHAINMAKER-4aab890d842f713c2ef36560c9919334",
      "retry_of": "",
      "signature": "MGYEIHyEVtCCimJZ3W4A2tofCiq9k3PG/mWBngp4BU6aKaP3A0IABJkqEWy+vK8FVgoN6nAXRFtufiwA5DvcMZiTsKKuQc+nGKAccaKX2emkKWFAp3X1nBYmNNYLkMO0baQCsIhJxhU=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-913c599c9ff38ccfed9480da1cf5c7aa",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-10-13 16:27:01.056",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 16:27:01.020",
      "cross_tx_id": "CX-0bfdf4a7f507",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 2,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-081dfd4df738364bd7c63894eb215b43",
      "reg_record_id": "REGREC-06fecba4066b",
      "reg_relay_tx_id": "CHAINMAKER-adc7498647023eeccfa7458b2649b18a",
      "retry_of": "",
      "signature": "MGYEIKfioQwKoRGaJHNR/3Iky/czhfu1c48oaUrRAKhwhlOgA0IABGfQ2pX9dh2/NJewf91xUc7gcxbA2ui+gZJcrGzmypcNka3gQIYGn9y0UaLkujEbZXOkbl/9ap5H1QP9xWMxM5E=",
      "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-55a84d9eb2521d7ebef2c9c60621d534",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
      "updated_at": "2026-10-13 16:27:01.022",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 16:27:01.012",
      "cross_tx_id": "CX-c30ba90d0bc6",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 3,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-3738a3d274976f3fe837956a10f99acb",
      "reg_record_id": "REGREC-3505535ecc31",
      "reg_relay_tx_id": "CHAINMAKER-8e451df4ec9c430534ce87317b41b79c",
      "retry_of": "",
      "signature": "MGYEIBETLlHX/rED51hphH9KV0bhEbWYu5uK6BdT3XMHYU0EA0IABFKf11USsABTwbAdup3qHbuVgqV9xYg5MhDtRkwKP958I0xhr04C2QYy5tb5tJITqrY2YXs8vlmMZbo2x//ALO0=",
      "sm3_hash": "00a44f288128c04712564533edf0206746af7acd8a51fbc9b43810b455bf3839",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-e1f7448824e6b110d556a17f7ddccb4d",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-7578f55d0615359bfcae79f1f0269b49",
      "updated_at": "2026-10-13 16:27:01.015",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-775bff78817f",
      "created_at": "2026-10-13 16:27:01.001",
      "cross_tx_id": "CX-4d7c101d5c96",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "2e0722b21c8ddac2c3241c2892338d98fef4aab2db93ccffb058c27f3d0380c4",
      "latency_ms": 4,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-5b0ad503f11fd97d941bbef96008e5dc",
      "reg_record_id": "REGREC-7507ee0c2177",
      "reg_relay_tx_id": "CHAINMAKER-865c1e236e9a90a218c254cb7e545da6",
      "retry_of": "",
      "signature": "MGYEIGjTR8LavQZW7K4T7ZhNE2MBodBEGTCldM/IwFy3RR0fA0IABDHvgRKCjfHiniMpkbfZvcHDZvCy5rc6c/5YLSHjiqfXnxfdUKebEnazwzmvz2Nir3Vt2jNnBIS3yD7CDMa1v7k=",
      "sm3_hash": "395c92b9b8b2faef11312bc9cd5db17bb510dd2f174b5bfc610684c4a44c8d30",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-f1c4783ade8093ece8e076899fd5106a",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-19d98e1d19c631903c99bbb272585b7c",
      "updated_at": "2026-10-13 16:27:01.005",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20261013-b21531",
      "created_at": "2026-10-13 16:27:00.996",
      "cross_tx_id": "CX-efd2c0599850",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "2f41f0d1e58acee79ce068f008896b12bb236e1cf4bfda8ef930b0624da16c42",
      "latency_ms": 3,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-ed2fa92be828160e08befae7ceb42ae7",
      "reg_record_id": "REGREC-e623b89e3410",
      "reg_relay_tx_id": "CHAINMAKER-f06d548ccc2ebfbe12ec54d653003084",
      "retry_of": "",
      "signature": "MGYEIFTAModvBn9w+RG/Wkms+qWsiEJaoy/JAw99FdkHDUNAA0IABIEaGf+2Gbpm5rYRny8MeAB7Eyzg3aWi4bGaGzH+LfvbhjEOvvWWhU3Bls+dMnTLQ1YT0CqDI8mbpbrLm5D7l4Y=",
      "sm3_hash": "09ca31cf928d5db9ccec26e8da53a2d055013bd3862467e8744f8cde54bd31b7",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-0023d194ee1811a8fa9803b07cdd69dd",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-9c45f6d77f71750178c674f68f93e89d",
      "updated_at": "2026-10-13 16:27:00.999",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-10-13 16:27:00.981",
      "cross_tx_id": "CX-c84decb13aae",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 3,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-8b669ead8dc7fa20933a942438bc8ba2",
      "reg_record_id": "REGREC-dcf1444d2864",
      "reg_relay_tx_id": "CHAINMAKER-12098ed82e821c1552e40492da16c642",
      "retry_of": "",
      "signature": "MGYEIEkE6CKq8rS44faqMDN3T/oKsl0DHodWDlmYOspShcRWA0IABLJq8jqgFu5T8N6krpyTJM7tPmj6zC9Pugx7oR/Vgyy+kBiJ7P+AvXZU1yvyXWKhyUmAZ0Sl2/zpBFMoLNcR+8I=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-d8a0fe29b4904ecdc953319a676401ce",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-10-13 16:27:00.984",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.062",
   "trace_id": "TRACE-20261013-bc3bc4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.092",
   "trace_id": "TRACE-20261013-92779f"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-0fd833b200c5"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-13 16:27:01.045",
    "cross_tx_id": "CX-0fd833b200c5",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 11,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-1a5d438773cb2e93d034d62ba9e96b54",
    "reg_record_id": "REGREC-8701abd24613",
    "reg_relay_tx_id": "CHAINMAKER-4aab890d842f713c2ef36560c9919334",
    "retry_of": "",
    "signature": "MGYEIHyEVtCCimJZ3W4A2tofCiq9k3PG/mWBngp4BU6aKaP3A0IABJkqEWy+vK8FVgoN6nAXRFtufiwA5DvcMZiTsKKuQc+nGKAccaKX2emkKWFAp3X1nBYmNNYLkMO0baQCsIhJxhU=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-913c599c9ff38ccfed9480da1cf5c7aa",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 16:27:01.056",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.060",
   "trace_id": "TRACE-20261013-597d91"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-10-13 16:27:01.091",
   "trace_id": "TRACE-20261013-bea882"
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
    "created_at": "2026-10-13 16:27:01.045",
    "cross_tx_id": "CX-0fd833b200c5",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 11,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-1a5d438773cb2e93d034d62ba9e96b54",
    "reg_record_id": "REGREC-8701abd24613",
    "reg_relay_tx_id": "CHAINMAKER-4aab890d842f713c2ef36560c9919334",
    "retry_of": "",
    "signature": "MGYEIHyEVtCCimJZ3W4A2tofCiq9k3PG/mWBngp4BU6aKaP3A0IABJkqEWy+vK8FVgoN6nAXRFtufiwA5DvcMZiTsKKuQc+nGKAccaKX2emkKWFAp3X1nBYmNNYLkMO0baQCsIhJxhU=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-913c599c9ff38ccfed9480da1cf5c7aa",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 16:27:01.056",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.057",
   "trace_id": "TRACE-20261013-e35aed"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-10-13 16:27:01.091",
   "trace_id": "TRACE-20261013-9d57a2"
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
    "generated_at": "2026-10-13 16:27:01.063",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-13 16:27:01.034",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 16:27:01.035"
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
   "timestamp": "2026-10-13 16:27:01.066",
   "trace_id": "TRACE-20261013-08805c"
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
    "generated_at": "2026-10-13 16:27:01.092",
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
   "timestamp": "2026-10-13 16:27:01.093",
   "trace_id": "TRACE-20261013-5565f6"
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
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20261013-274de4,RUN-3e0c00563617,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-10-13 16:27:01.068,2026-10-13 16:27:01.069\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.071",
   "trace_id": "TRACE-20261013-02c409"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.094",
   "trace_id": "TRACE-20261013-9efac6"
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
      "completed_at": "2026-10-13 16:27:01.069",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20261013-274de4",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-3e0c00563617",
      "scenario": "",
      "started_at": "2026-10-13 16:27:01.068",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.071",
   "trace_id": "TRACE-20261013-e75628"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 16:27:01.094",
   "trace_id": "TRACE-20261013-dd10dd"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-3e0c00563617"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-13 16:27:01.069",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-274de4",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-3e0c00563617",
    "scenario": "",
    "started_at": "2026-10-13 16:27:01.068",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.070",
   "trace_id": "TRACE-20261013-30271b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-10-13 16:27:01.093",
   "trace_id": "TRACE-20261013-85d804"
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
    "completed_at": "2026-10-13 16:27:01.069",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-274de4",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-3e0c00563617",
    "scenario": "",
    "started_at": "2026-10-13 16:27:01.068",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 16:27:01.069",
   "trace_id": "TRACE-20261013-b2200f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-10-13 16:27:01.093",
   "trace_id": "TRACE-20261013-8dc9c6"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "UOM登记", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "遥测", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验"];
