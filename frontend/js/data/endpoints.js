// 由 docs/apifox/skytrust-backend.openapi.json 生成（80 端点全量，含录制样例）。
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
   "timestamp": "2026-10-20 15:18:30.450",
   "trace_id": "TRACE-20261020-447909"
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
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-c30cc7"
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
   "timestamp": "2026-10-20 15:18:30.450",
   "trace_id": "TRACE-20261020-090db8"
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
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-0e00a9"
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
   "timestamp": "2026-10-20 15:18:30.450",
   "trace_id": "TRACE-20261020-ea17ad"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-f91103"
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
   "timestamp": "2026-10-20 15:18:30.451",
   "trace_id": "TRACE-20261020-bee782"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-37af6a"
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
   "timestamp": "2026-10-20 15:18:30.451",
   "trace_id": "TRACE-20261020-9deb2e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-71ab16"
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
    "signature": "MGYEIJKiLmjnxwGyT0ryfhKzWRXO+IQNzjVB39vQ503Q7CTJA0IABHlks4Wowv6RaYfYF3jponyiUxb95gtucEbCENxZ0kc8OnTaw1oFrn0qhCXDKbaYoQN/xwn1U/R59nuTsEe5wmc=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.451",
   "trace_id": "TRACE-20261020-c3ad12"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-657ec5"
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
   "timestamp": "2026-10-20 15:18:30.452",
   "trace_id": "TRACE-20261020-e85e28"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-10-20 15:18:30.530",
   "trace_id": "TRACE-20261020-99b784"
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
   "timestamp": "2026-10-20 15:18:30.453",
   "trace_id": "TRACE-20261020-034251"
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
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-524527"
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
    "reset_at": "2026-10-20 15:18:30.529",
    "started_at": "2026-10-20 15:18:30.529",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.529",
   "trace_id": "TRACE-20261020-d70a2b"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-20 15:18:30.544",
    "started_at": "2026-10-20 15:18:30.544",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.544",
   "trace_id": "TRACE-20261020-663f61"
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
      "created_at": "2026-10-20 15:18:30.441",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.441"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-10-20 15:18:30.441",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.441"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-10-20 15:18:30.441",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.441"
     },
     {
      "adapter_type": "",
      "created_at": "2026-10-20 15:18:30.453",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.453"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.454",
   "trace_id": "TRACE-20261020-29ee9c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-05449f"
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
    "created_at": "2026-10-20 15:18:30.453",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-10-20 15:18:30.453"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.454",
   "trace_id": "TRACE-20261020-0a9ab0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-5fef56"
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
      "created_at": "2026-10-20 15:18:30.442",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-10-20 15:18:30.442",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-10-20 15:18:30.442",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-10-20 15:18:30.454",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-20 15:18:30.454"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.455",
   "trace_id": "TRACE-20261020-0bda32"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-e28cfa"
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
    "created_at": "2026-10-20 15:18:30.454",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-10-20 15:18:30.454"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.454",
   "trace_id": "TRACE-20261020-8ac246"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-fcfd98"
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
    "created_at": "2026-10-20 15:18:30.455",
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
   "timestamp": "2026-10-20 15:18:30.455",
   "trace_id": "TRACE-20261020-bef6ab"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-10-20 15:18:30.533",
   "trace_id": "TRACE-20261020-fa7c72"
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
      "created_at": "2026-10-20 15:18:30.448",
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
      "created_at": "2026-10-20 15:18:30.448",
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
      "created_at": "2026-10-20 15:18:30.448",
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
      "created_at": "2026-10-20 15:18:30.448",
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
      "created_at": "2026-10-20 15:18:30.448",
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
      "created_at": "2026-10-20 15:18:30.455",
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
   "timestamp": "2026-10-20 15:18:30.456",
   "trace_id": "TRACE-20261020-a9040f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-4581ca"
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
     "created_at": "2026-10-20 15:18:30.458",
     "expires_at": "2028-10-20 15:18:30.457",
     "id_number": "420100199001010011",
     "issued_at": "2026-10-20 15:18:30.457",
     "license_id": "PIL-ff9188bb4ce4",
     "license_no": "UAV-PILOT-2026-3672",
     "name": "文档样例操控员",
     "signature": "MGYEIE5f1lLuffXM/u7VecEoDVezzySedMbM6HZbpyZcj6FqA0IABGFwk3rodK+I8pBbmRLUXuLtxHD2R5ALtHN39Pl0rgM7alEYs+XwawUb6C773TT5nASSq65PmV/mViFrtWX5qP8=",
     "status": "ISSUED",
     "updated_at": "2026-10-20 15:18:30.458"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.458",
   "trace_id": "TRACE-20261020-749f62"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotApplyReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-f28f08"
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
      "created_at": "2026-10-20 15:18:30.458",
      "expires_at": "2028-10-20 15:18:30.457",
      "id_number": "420100199001010011",
      "issued_at": "2026-10-20 15:18:30.457",
      "license_id": "PIL-ff9188bb4ce4",
      "license_no": "UAV-PILOT-2026-3672",
      "name": "文档样例操控员",
      "signature": "MGYEIE5f1lLuffXM/u7VecEoDVezzySedMbM6HZbpyZcj6FqA0IABGFwk3rodK+I8pBbmRLUXuLtxHD2R5ALtHN39Pl0rgM7alEYs+XwawUb6C773TT5nASSq65PmV/mViFrtWX5qP8=",
      "status": "ISSUED",
      "updated_at": "2026-10-20 15:18:30.458"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.458",
   "trace_id": "TRACE-20261020-b9e5d0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-e90a3e"
  }
 },
 {
  "path": "/api/pilot/query",
  "tag": "UOM登记",
  "summary": "执照查询（不存在→7002）",
  "operationId": "pilotQuery",
  "req": {
   "license_id": "PIL-ff9188bb4ce4"
  },
  "resp": {
   "code": 0,
   "data": {
    "category": "多旋翼",
    "created_at": "2026-10-20 15:18:30.458",
    "expires_at": "2028-10-20 15:18:30.457",
    "id_number": "420100199001010011",
    "issued_at": "2026-10-20 15:18:30.457",
    "license_id": "PIL-ff9188bb4ce4",
    "license_no": "UAV-PILOT-2026-3672",
    "name": "文档样例操控员",
    "signature": "MGYEIE5f1lLuffXM/u7VecEoDVezzySedMbM6HZbpyZcj6FqA0IABGFwk3rodK+I8pBbmRLUXuLtxHD2R5ALtHN39Pl0rgM7alEYs+XwawUb6C773TT5nASSq65PmV/mViFrtWX5qP8=",
    "status": "ISSUED",
    "updated_at": "2026-10-20 15:18:30.458"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.459",
   "trace_id": "TRACE-20261020-89eb52"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotQueryReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-b74309"
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
      "created_at": "2026-10-20 15:18:30.456",
      "id_number": "91420100DOCAIR01X",
      "name": "文档样例物流企业",
      "status": "REGISTERED",
      "subject_id": "RNS-ae78932576d8",
      "subject_type": "ENTERPRISE",
      "updated_at": "2026-10-20 15:18:30.456"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.457",
   "trace_id": "TRACE-20261020-8aead6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-eb7b3c"
  }
 },
 {
  "path": "/api/realname/query",
  "tag": "UOM登记",
  "summary": "实名主体查询（不存在→7001）",
  "operationId": "realnameQuery",
  "req": {
   "subject_id": "RNS-ae78932576d8"
  },
  "resp": {
   "code": 0,
   "data": {
    "contact": "027-88880001",
    "created_at": "2026-10-20 15:18:30.456",
    "id_number": "91420100DOCAIR01X",
    "name": "文档样例物流企业",
    "status": "REGISTERED",
    "subject_id": "RNS-ae78932576d8",
    "subject_type": "ENTERPRISE",
    "updated_at": "2026-10-20 15:18:30.456"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.457",
   "trace_id": "TRACE-20261020-610648"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameQueryReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-601e2c"
  }
 },
 {
  "path": "/api/realname/register",
  "tag": "UOM登记",
  "summary": "实名登记（个人/企业；→REGISTERED）",
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
     "created_at": "2026-10-20 15:18:30.456",
     "id_number": "91420100DOCAIR01X",
     "name": "文档样例物流企业",
     "status": "REGISTERED",
     "subject_id": "RNS-ae78932576d8",
     "subject_type": "ENTERPRISE",
     "updated_at": "2026-10-20 15:18:30.456"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.456",
   "trace_id": "TRACE-20261020-f74b16"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameRegisterReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-bb59b7"
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
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260001",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260002",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260003",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260004",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260005",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260006",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.442",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260007",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-10-20 15:18:30.442"
     },
     {
      "created_at": "2026-10-20 15:18:30.459",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "realname_id": "RNS-ae78932576d8",
      "registration_mark": "UAS-64031790",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-10-20 15:18:30.465"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.466",
   "trace_id": "TRACE-20261020-2e9508"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-0fb6c9"
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
    "created_at": "2026-10-20 15:18:30.459",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-ae78932576d8",
    "registration_mark": "UAS-64031790",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-20 15:18:30.465"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.465",
   "trace_id": "TRACE-20261020-ee68e4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-e83349"
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
   "realname_id": "RNS-ae78932576d8",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-10-20 15:18:30.461",
     "cross_tx_id": "CX-0b84aab8495d",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 3,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-0ab5756006bb69c02183d104a76359f2",
     "reg_record_id": "REGREC-36516f4b8fa9",
     "reg_relay_tx_id": "CHAINMAKER-797e3f62400be70092a3a0c10e637483",
     "retry_of": "",
     "signature": "MGYEILYCqMWatl/GVSPx6jwT8pzZUTROA4o8IrfDX7erj8KpA0IABDUVijB9l+fnJQ67LHCJBdZhC6mg1j7KoM0smbZZyOxZTlX2TWWdDnFNkV3MXIszUGkwzhxtbwTed0/7fyUqoEQ=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-75a3bc8f51dae3530f78ba7ea8259820",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-10-20 15:18:30.464",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-10-20 15:18:30.459",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-ae78932576d8",
     "registration_mark": "UAS-64031790",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-20 15:18:30.465"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.465",
   "trace_id": "TRACE-20261020-3a1e92"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-f8cb64"
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
    "created_at": "2026-10-20 15:18:30.459",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-ae78932576d8",
    "registration_mark": "UAS-64031790",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-20 15:18:30.467"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.467",
   "trace_id": "TRACE-20261020-ab45af"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-c5679f"
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
     "created_at": "2026-10-20 15:18:30.459",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-ae78932576d8",
     "registration_mark": "UAS-64031790",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-20 15:18:30.466"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.466",
   "trace_id": "TRACE-20261020-9accd1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-10-20 15:18:30.534",
   "trace_id": "TRACE-20261020-2e205c"
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
    "created_at": "2026-10-20 15:18:30.471",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIKimB6q8gFypck9KRpki1I+id5aoUUwvaQThYF13TdA3A0IABA+9Y8Er7bvzjtqFhifwn/gMSvidyOZHMh1w5v7bvXX8aD/PeR2kzVcNwwsgHutOIcRLDXHOm8526sg98TBUAus=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-20 15:18:30.471",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.471",
   "trace_id": "TRACE-20261020-254df7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-ec6461"
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
      "created_at": "2026-10-20 15:18:30.471",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "pilot_license_id": "",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIKimB6q8gFypck9KRpki1I+id5aoUUwvaQThYF13TdA3A0IABA+9Y8Er7bvzjtqFhifwn/gMSvidyOZHMh1w5v7bvXX8aD/PeR2kzVcNwwsgHutOIcRLDXHOm8526sg98TBUAus=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-20 15:18:30.471",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.472",
   "trace_id": "TRACE-20261020-f1ea09"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-9e73e6"
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
    "created_at": "2026-10-20 15:18:30.471",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIKimB6q8gFypck9KRpki1I+id5aoUUwvaQThYF13TdA3A0IABA+9Y8Er7bvzjtqFhifwn/gMSvidyOZHMh1w5v7bvXX8aD/PeR2kzVcNwwsgHutOIcRLDXHOm8526sg98TBUAus=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-20 15:18:30.471",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.472",
   "trace_id": "TRACE-20261020-c56b8c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-6ea18f"
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
     "application_id": "APP-20261020-dc6434",
     "created_at": "2026-10-20 15:18:30.473",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEIEn6a38lcNwnRlGD5ErUuaa8YELBdw4Yk7N8tVcmk0kyA0IABD4dWUARVQH9LUFkQXSpZtUU9qMXJX2+c4ORgImcb3yepyicWjDIDJWuIh/lvlqnhhWNqNurbr4WBAYpCE4gOFc=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-1e228f9f91f9d9d237732295da94c6d3",
     "status": "RELAYED",
     "updated_at": "2026-10-20 15:18:30.478"
    },
    "crosschain": {
     "business_id": "APP-20261020-dc6434",
     "created_at": "2026-10-20 15:18:30.475",
     "cross_tx_id": "CX-2a583ba1509b",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "52c3d730908dcdf4139d4f6e0fb2f5175747ce26d14e37f10cd663b5af1db226",
     "latency_ms": 3,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-38d45e17ecb4c433cb245d3136d2c5ba",
     "reg_record_id": "REGREC-356dbc7566f4",
     "reg_relay_tx_id": "CHAINMAKER-d4e0db3f7ef989ed6d596aef5ee6adf6",
     "retry_of": "",
     "signature": "MGYEIDwYNV42DXqtpNCe+dhWI7DJHlHeQdxWGEDD4ObqIo8YA0IABEyugdTbxhrHPbCnC18USyXMN6I/e6EFgI8skYtjt6ZMA6nX4rmZ4E48/lbRZMZ0GfueYuOdOgFDh14c/zY+EyU=",
     "sm3_hash": "b980f3209dee7cf3802ce4a61db605898fa37b171dd934895b21714419560d24",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-1e228f9f91f9d9d237732295da94c6d3",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-87d78474fcc2c04a7e324d78ff774457",
     "updated_at": "2026-10-20 15:18:30.478",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.478",
   "trace_id": "TRACE-20261020-5f5712"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-26f5bf"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20261020-dc6434"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20261020-dc6434",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-8e76ba13bf49",
      "review_time": "2026-10-20 15:18:30.479",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.483",
   "trace_id": "TRACE-20261020-f4bcf0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-4cdb31"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20261020-dc6434",
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
     "business_id": "REV-8e76ba13bf49",
     "created_at": "2026-10-20 15:18:30.479",
     "cross_tx_id": "CX-be10f8a76f5c",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "67c9856ca7d618d7cb84a1195235655473a6f1a121d2ac2d3ea59a5e1184b496",
     "latency_ms": 2,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-e6e24ed3f1cf1e9dc3171318bb67cb94",
     "reg_record_id": "REGREC-12fe895ffbbd",
     "reg_relay_tx_id": "CHAINMAKER-89aed7621b5abb865f6bb60742880660",
     "retry_of": "",
     "signature": "MGYEIF8PgAeeBuOuz/CYw8Tm+oP3pana/MLQn3gt7sACp1MWA0IABER9LU6f3vO+Vn7DDuSyTKM+H4yUiE6Op+bCA3O99SZxSb5IJE2RoKzsD+HbICIoI7PO/omra8PXvCuZAgdVqig=",
     "sm3_hash": "14690c55d5ec2ca1c4959442587529dba57644fde3b486fd7d4f717c6080baaa",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-6d10ca6fb1144bd32c9b8b40357ed69c",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-d65c29ca3187ec9ce4597ac1482ac039",
     "updated_at": "2026-10-20 15:18:30.482",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-20 15:18:30.471",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIKimB6q8gFypck9KRpki1I+id5aoUUwvaQThYF13TdA3A0IABA+9Y8Er7bvzjtqFhifwn/gMSvidyOZHMh1w5v7bvXX8aD/PeR2kzVcNwwsgHutOIcRLDXHOm8526sg98TBUAus=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-20 15:18:30.483",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20261020-dc6434",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-8e76ba13bf49",
     "review_time": "2026-10-20 15:18:30.479",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.483",
   "trace_id": "TRACE-20261020-f49302"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-10-20 15:18:30.535",
   "trace_id": "TRACE-20261020-1041a8"
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
   "timestamp": "2026-10-20 15:18:30.484",
   "trace_id": "TRACE-20261020-eefed3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-593c9f"
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
   "timestamp": "2026-10-20 15:18:30.484",
   "trace_id": "TRACE-20261020-ab95cf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-be4acb"
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
   "valid_from": "2026-10-20 14:18:30.441",
   "valid_to": "2026-10-20 16:18:30.441"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-20 15:18:30.486",
     "cross_tx_id": "CX-7c3c9f06fef9",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 4,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-6ea3ddb0cadef9c7aed48e5657be7171",
     "reg_record_id": "REGREC-0b404060fd7e",
     "reg_relay_tx_id": "CHAINMAKER-277095c1607adc64889d1e8daaa9aac7",
     "retry_of": "",
     "signature": "MGYEIG/NMXGUYyxf1V71eqCwMv7i762V+ZX6b0oI2jxflYERA0IABGI9O3Ui4qRooiPAh9vip4PFhR5YNrBrI6fVvrtCPAi0m1zydaVvj1RO1PL1mjdSHDolF4uyYWReBt17ChR+GSE=",
     "sm3_hash": "2967cab3c727fff7b1f24a2550e0931dcbe8775fda19e7e3550f3e02f9ff6e2a",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-2f2e11ab56228682edc73f4d2a25fcf0",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-37c0311c11d9206853f72b57261f6c0c",
     "updated_at": "2026-10-20 15:18:30.490",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-10-20 15:18:30.485",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIH01gAGO0E2AsyGCpx1o/3x0gLilMEjLbZeKKSQJIWbGA0IABBflWdCpi3ht4g1bBZr4jl6M6yUtVtbJNcN0yQL0WRgfaDLOxtM3EmEYvWu2ANSOuzN+O4yADm5xTJB7eaDKI9U=",
     "sm3_hash": "14669d70815b92c81c7f360f7a32270d0f823e40246bc9971387a8db5a7af9d1",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-20 15:18:30.490",
     "valid_from": "2026-10-20 14:18:30.441",
     "valid_to": "2026-10-20 16:18:30.441"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.491",
   "trace_id": "TRACE-20261020-c0d8f7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-d08f77"
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
      "created_at": "2026-10-20 15:18:30.485",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIH01gAGO0E2AsyGCpx1o/3x0gLilMEjLbZeKKSQJIWbGA0IABBflWdCpi3ht4g1bBZr4jl6M6yUtVtbJNcN0yQL0WRgfaDLOxtM3EmEYvWu2ANSOuzN+O4yADm5xTJB7eaDKI9U=",
      "sm3_hash": "14669d70815b92c81c7f360f7a32270d0f823e40246bc9971387a8db5a7af9d1",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-20 15:18:30.490",
      "valid_from": "2026-10-20 14:18:30.441",
      "valid_to": "2026-10-20 16:18:30.441"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.492",
   "trace_id": "TRACE-20261020-8c78ae"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-40c968"
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
    "created_at": "2026-10-20 15:18:30.485",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIH01gAGO0E2AsyGCpx1o/3x0gLilMEjLbZeKKSQJIWbGA0IABBflWdCpi3ht4g1bBZr4jl6M6yUtVtbJNcN0yQL0WRgfaDLOxtM3EmEYvWu2ANSOuzN+O4yADm5xTJB7eaDKI9U=",
    "sm3_hash": "14669d70815b92c81c7f360f7a32270d0f823e40246bc9971387a8db5a7af9d1",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-20 15:18:30.490",
    "valid_from": "2026-10-20 14:18:30.441",
    "valid_to": "2026-10-20 16:18:30.441"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.491",
   "trace_id": "TRACE-20261020-caac73"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-20 15:18:30.536",
   "trace_id": "TRACE-20261020-4d3c59"
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
     "created_at": "2026-10-20 15:18:30.494",
     "cross_tx_id": "CX-57b16749dc90",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 2,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-c5a2d8d28c56205e6482b97c8b4f848a",
     "reg_record_id": "REGREC-2e163b93821a",
     "reg_relay_tx_id": "CHAINMAKER-f2804b66c4b75ebb8757e34f1354d68d",
     "retry_of": "",
     "signature": "MGYEIEM6hjsJ5ss7xj5j/DCw9LoYrqWQUKdr9cJ2i0PDy9vwA0IABF2jSx1rICeuTYucdzhpa4EWWt/h77HFGYFN3EGkagx+PaMA+ltIOugARZ1HHqaDITb7OjuhMnNIQH8FrjkTzhw=",
     "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-333c4e9b14ddf52ef6c669cf3fba6770",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
     "updated_at": "2026-10-20 15:18:30.497",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-10-20 15:18:30.485",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIH01gAGO0E2AsyGCpx1o/3x0gLilMEjLbZeKKSQJIWbGA0IABBflWdCpi3ht4g1bBZr4jl6M6yUtVtbJNcN0yQL0WRgfaDLOxtM3EmEYvWu2ANSOuzN+O4yADm5xTJB7eaDKI9U=",
     "sm3_hash": "14669d70815b92c81c7f360f7a32270d0f823e40246bc9971387a8db5a7af9d1",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-20 15:18:30.493",
     "valid_from": "2026-10-20 14:18:30.441",
     "valid_to": "2026-10-20 16:18:30.441"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.497",
   "trace_id": "TRACE-20261020-9ff305"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-10-20 15:18:30.537",
   "trace_id": "TRACE-20261020-a10f76"
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
   "timestamp": "2026-10-20 15:18:30.493",
   "trace_id": "TRACE-20261020-9b1c8b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-20 15:18:30.537",
   "trace_id": "TRACE-20261020-36d337"
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.498",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
   "timestamp": "2026-10-20 15:18:30.499",
   "trace_id": "TRACE-20261020-589d58"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-14aad6"
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
    "created_at": "2026-10-20 15:18:30.498",
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
   "timestamp": "2026-10-20 15:18:30.499",
   "trace_id": "TRACE-20261020-bc8768"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-bc8c59"
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
      "created_at": "2026-10-20 15:18:30.449",
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
   "timestamp": "2026-10-20 15:18:30.498",
   "trace_id": "TRACE-20261020-33b554"
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
      "created_at": "2026-10-20 15:18:30.532",
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
   "timestamp": "2026-10-20 15:18:30.537",
   "trace_id": "TRACE-20261020-bd4e8a"
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
   "session_id": "SESS-21c5b96e64dd"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-20 15:18:30.500",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-21c5b96e64dd",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-20 15:18:30.507"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.507",
   "trace_id": "TRACE-20261020-cf1744"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-3fa497"
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
      "created_at": "2026-10-20 15:18:30.500",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-21c5b96e64dd",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-20 15:18:30.500"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.501",
   "trace_id": "TRACE-20261020-bc3dc8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-7c197f"
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
     "nonce": "NONCE-f149ab8d076986635b23247e22412b35",
     "signature": "MGYEIEoE1rLOL0WKjbap3HMPq6J/oEi3XXJsf6C5HD65Zm9aA0IABD7Dl/CdKKgwxVer88SCTb8SWH6rWdi37ALFuVM2k6tCj2A4yaxQcE/7AhvsRnX2+Vmw0QOpWW4RoGRgHuy8yII=",
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
     "created_at": "2026-10-20 15:18:30.500",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-21c5b96e64dd",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-20 15:18:30.500"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.500",
   "trace_id": "TRACE-20261020-16dbc3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-30054f"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-21c5b96e64dd"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-20 15:18:30.502",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIHNPr737GPJ1gfZXAfQTDC0A2s/PpiXZjL7S8XCyBOp1A0IABDRR26/xD9z/fsAGUoEjSjlF7R9YagA2oAXoZtc8LFZcZSwZGEZ0BHK5CpsxvHqfW59ITEEsAIuRCHnPhXkkxO0=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-126c0c097a9eb20a",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-21c5b96e64dd",
      "sm3_hash": "df5d0bb4abc2054266cd89f7852deb0fc6d9747767f95476fa609aec3871c0e7",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-10-20 15:18:30.501"
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
   "timestamp": "2026-10-20 15:18:30.502",
   "trace_id": "TRACE-20261020-20a7c7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-7db9d5"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-21c5b96e64dd",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-10-20 15:18:30.502",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIHNPr737GPJ1gfZXAfQTDC0A2s/PpiXZjL7S8XCyBOp1A0IABDRR26/xD9z/fsAGUoEjSjlF7R9YagA2oAXoZtc8LFZcZSwZGEZ0BHK5CpsxvHqfW59ITEEsAIuRCHnPhXkkxO0=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-126c0c097a9eb20a",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-21c5b96e64dd",
     "sm3_hash": "df5d0bb4abc2054266cd89f7852deb0fc6d9747767f95476fa609aec3871c0e7",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-10-20 15:18:30.501"
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
   "timestamp": "2026-10-20 15:18:30.502",
   "trace_id": "TRACE-20261020-1fe77b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-14462f"
  }
 },
 {
  "path": "/api/telemetry/latest",
  "tag": "遥测",
  "summary": "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）",
  "operationId": "telemetryLatest",
  "req": {
   "session_id": "SESS-21c5b96e64dd"
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-20 15:18:30.503",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-20 15:18:30.503",
     "seq": 1,
     "session_id": "SESS-21c5b96e64dd",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-e71d50f01d2d",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.504",
   "trace_id": "TRACE-20261020-4f88c7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-d8d3e0"
  }
 },
 {
  "path": "/api/telemetry/list",
  "tag": "遥测",
  "summary": "遥测分页列表（session_id/uav_id 过滤）",
  "operationId": "telemetryList",
  "req": {
   "session_id": "SESS-21c5b96e64dd"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alt": 85,
      "created_at": "2026-10-20 15:18:30.503",
      "heading": 45,
      "lat": 30.52,
      "lon": 114.32,
      "mission_id": "",
      "reported_at": "2026-10-20 15:18:30.503",
      "seq": 1,
      "session_id": "SESS-21c5b96e64dd",
      "source": "MANUAL",
      "speed": 12,
      "telemetry_id": "TLM-e71d50f01d2d",
      "uav_id": "UAV-A-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.503",
   "trace_id": "TRACE-20261020-b9ef37"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-7c7b96"
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
   "session_id": "SESS-21c5b96e64dd",
   "speed": 12
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-20 15:18:30.503",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-20 15:18:30.503",
     "seq": 1,
     "session_id": "SESS-21c5b96e64dd",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-e71d50f01d2d",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.503",
   "trace_id": "TRACE-20261020-1f6007"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.TelemetryReportRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-9cb631"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-21c5b96e64dd"
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
   "timestamp": "2026-10-20 15:18:30.506",
   "trace_id": "TRACE-20261020-56a4aa"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-d8fcdb"
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
   "timestamp": "2026-10-20 15:18:30.506",
   "trace_id": "TRACE-20261020-88bdae"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-c2779d"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-21c5b96e64dd"
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
   "timestamp": "2026-10-20 15:18:30.506",
   "trace_id": "TRACE-20261020-b9fdcb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-174e18"
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
   "timestamp": "2026-10-20 15:18:30.505",
   "trace_id": "TRACE-20261020-252eb7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-10-20 15:18:30.538",
   "trace_id": "TRACE-20261020-ce5573"
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
      "created_at": "2026-10-20 15:18:30.507",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-20 15:18:30.507"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.508",
   "trace_id": "TRACE-20261020-e57121"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-1c3123"
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
    "created_at": "2026-10-20 15:18:30.507",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-20 15:18:30.507"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.507",
   "trace_id": "TRACE-20261020-49ed8c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-4df9f3"
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
    "created_at": "2026-10-20 15:18:30.507",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-20 15:18:30.508"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.508",
   "trace_id": "TRACE-20261020-5bf1d2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-5cc23f"
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
   "timestamp": "2026-10-20 15:18:30.509",
   "trace_id": "TRACE-20261020-a845d1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-8a1134"
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
    "audit_hash": "7b06711abb1e5bc341138055571f8fac8d25cc9b82c48c3789a4f4d85e9684c6",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-10-20 15:18:30.509",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-10-20 15:18:30.509",
    "valid_from": "2026-10-20 15:18:30.509",
    "valid_to": "2026-10-21 15:18:30.509"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.510",
   "trace_id": "TRACE-20261020-d8c60e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-10-20 15:18:30.539",
   "trace_id": "TRACE-20261020-cc98f1"
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
     "audit_hash": "7b06711abb1e5bc341138055571f8fac8d25cc9b82c48c3789a4f4d85e9684c6",
     "audit_id": "AUD-2b3f90b0699e",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-acf027a67bf6c25702ddc1c52b818c10",
     "created_at": "2026-10-20 15:18:30.510",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "7b06711abb1e5bc341138055571f8fac8d25cc9b82c48c3789a4f4d85e9684c6",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-10-20 15:18:30.509",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-10-20 15:18:30.510",
     "valid_from": "2026-10-20 15:18:30.509",
     "valid_to": "2026-10-21 15:18:30.509"
    },
    "chain_tx_id": "CHAINMAKER-acf027a67bf6c25702ddc1c52b818c10"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.510",
   "trace_id": "TRACE-20261020-8c0a71"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-bdc66b"
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
    "chain_tx_id": "CHAINMAKER-4cca0cc275991e24f5e7bc9a3a5b3272",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-20 15:18:30.471",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIKimB6q8gFypck9KRpki1I+id5aoUUwvaQThYF13TdA3A0IABA+9Y8Er7bvzjtqFhifwn/gMSvidyOZHMh1w5v7bvXX8aD/PeR2kzVcNwwsgHutOIcRLDXHOm8526sg98TBUAus=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-20 15:18:30.483",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-766dfb56137f",
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
     "audit_hash": "fab267a1a491c7a15bcce8b7b6edb5cefad793f9a2ddbbb5330f53cbfec324b5",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.513",
   "trace_id": "TRACE-20261020-7751b7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-1c1185"
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
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-766dfb56137f,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",fab267a1a491c7a15bcce8b7b6edb5cefad793f9a2ddbbb5330f53cbfec324b5,CHAINMAKER-4cca0cc275991e24f5e7bc9a3a5b3272,2026-10-20 15:18:30.513\nAUD-2b3f90b0699e,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",7b06711abb1e5bc341138055571f8fac8d25cc9b82c48c3789a4f4d85e9684c6,CHAINMAKER-acf027a67bf6c25702ddc1c52b818c10,2026-10-20 15:18:30.510\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.513",
   "trace_id": "TRACE-20261020-6ea135"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-1983fd"
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
      "audit_hash": "fab267a1a491c7a15bcce8b7b6edb5cefad793f9a2ddbbb5330f53cbfec324b5",
      "audit_id": "AUD-766dfb56137f",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-4cca0cc275991e24f5e7bc9a3a5b3272",
      "created_at": "2026-10-20 15:18:30.513",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.513",
   "trace_id": "TRACE-20261020-8f8aaf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-b1990b"
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
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n77,TRACE-20261020-7751b7,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-4cca0cc275991e24f5e7bc9a3a5b3272\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-10-20 15:18:30.513\n76,TRACE-20261020-8c0a71,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-acf027a67bf6c25702ddc1c52b818c10\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-10-20 15:18:30.510\n75,TRACE-20261020-d8c60e,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-10-20 15:18:30.509\"\",\"\"valid_to\"\":\"\"2026-10-21 15:18:30.509\"\"}\",2026-10-20 15:18:30.509\n74,TRACE-20261020-a845d1,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":0,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-20 15:18:30.509\n73,TRACE-20261020-5bf1d2,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-10-20 15:18:30.508\n72,TRACE-20261020-49ed8c,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-10-20 15:18:30.507\n71,TRACE-20261020-cf1744,OP-1,SESSION_CLOSE,SESSION,SESS-21c5b96e64dd,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-10-20 15:18:30.507\n70,TRACE-20261020-cf1744,OP-1,STATE_TRANSITION,SESSION,SESS-21c5b96e64dd,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-10-20 15:18:30.507\n69,TRACE-20261020-252eb7,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-10-20 15:18:30.505\n68,TRACE-20261020-1f6007,UAV-A-001,TELEMETRY_REPORT,TELEMETRY,TLM-e71d50f01d2d,\"{\"\"position\"\":[30.52,114.32,85],\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-21c5b96e64dd\"\",\"\"source\"\":\"\"MANUAL\"\"}\",2026-10-20 15:18:30.503\n67,TRACE-20261020-1fe77b,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-126c0c097a9eb20a,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-21c5b96e64dd\"\"}\",2026-10-20 15:18:30.502\n66,TRACE-20261020-16dbc3,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-21c5b96e64dd,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-20 15:18:30.500\n65,TRACE-20261020-16dbc3,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-21c5b96e64dd,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-10-20 15:18:30.500\n64,TRACE-20261020-16dbc3,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-21c5b96e64dd,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-10-20 15:18:30.500\n63,TRACE-20261020-bc8768,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-10-20 15:18:30.499\n62,TRACE-20261020-9ff305,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-57b16749dc90,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":2,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-c5a2d8d28c56205e6482b97c8b4f848a\"\",\"\"reg_record_id\"\":\"\"REGREC-2e163b93821a\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-f2804b66c4b75ebb8757e34f1354d68d\"\",\"\"source_chain_tx_id\"\":\"\"IRITA-333c4e9b14ddf52ef6c669cf3fba6770\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-f940482d4b81d054b0e01f459d0f6664\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-10-20 15:18:30.497\n61,TRACE-20261020-9ff305,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-57b16749dc90,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20261020-9ff305\"\"}\",2026-10-20 15:18:30.497\n60,TRACE-20261020-9ff305,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-57b16749dc90,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20261020-9ff305\"\"}\",2026-10-20 15:18:30.497\n59,TRACE-20261020-9ff305,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-57b16749dc90,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20261020-9ff305\"\"}\",2026-10-20 15:18:30.497\n58,TRACE-20261020-9ff305,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-57b16749dc90,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20261020-9ff305\"\"}\",2026-10-20 15:18:30.497\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.515",
   "trace_id": "TRACE-20261020-7d86a9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-1669d1"
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
      "created_at": "2026-10-20 15:18:30.513",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-4cca0cc275991e24f5e7bc9a3a5b3272\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 77,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20261020-7751b7"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-10-20 15:18:30.510",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-acf027a67bf6c25702ddc1c52b818c10\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 76,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261020-8c0a71"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-10-20 15:18:30.509",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-10-20 15:18:30.509\",\"valid_to\":\"2026-10-21 15:18:30.509\"}",
      "id": 75,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261020-d8c60e"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-10-20 15:18:30.509",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":0,\"uav_id\":\"UAV-A-001\"}",
      "id": 74,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20261020-a845d1"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-10-20 15:18:30.508",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 73,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261020-5bf1d2"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-10-20 15:18:30.507",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 72,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261020-49ed8c"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-10-20 15:18:30.507",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 71,
      "target_id": "SESS-21c5b96e64dd",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261020-cf1744"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-10-20 15:18:30.507",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 70,
      "target_id": "SESS-21c5b96e64dd",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261020-cf1744"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-10-20 15:18:30.505",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 69,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20261020-252eb7"
     },
     {
      "action": "TELEMETRY_REPORT",
      "actor": "UAV-A-001",
      "created_at": "2026-10-20 15:18:30.503",
      "detail": "{\"position\":[30.52,114.32,85],\"seq\":1,\"session_id\":\"SESS-21c5b96e64dd\",\"source\":\"MANUAL\"}",
      "id": 68,
      "target_id": "TLM-e71d50f01d2d",
      "target_type": "TELEMETRY",
      "trace_id": "TRACE-20261020-1f6007"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-20 15:18:30.502",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-21c5b96e64dd\"}",
      "id": 67,
      "target_id": "MSG-126c0c097a9eb20a",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20261020-1fe77b"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-20 15:18:30.500",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 66,
      "target_id": "SESS-21c5b96e64dd",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261020-16dbc3"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-20 15:18:30.500",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 65,
      "target_id": "SESS-21c5b96e64dd",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261020-16dbc3"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-20 15:18:30.500",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 64,
      "target_id": "SESS-21c5b96e64dd",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261020-16dbc3"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-10-20 15:18:30.499",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 63,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20261020-bc8768"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-10-20 15:18:30.497",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":2,\"reg_receive_tx_id\":\"CHAINMAKER-c5a2d8d28c56205e6482b97c8b4f848a\",\"reg_record_id\":\"REGREC-2e163b93821a\",\"reg_relay_tx_id\":\"CHAINMAKER-f2804b66c4b75ebb8757e34f1354d68d\",\"source_chain_tx_id\":\"IRITA-333c4e9b14ddf52ef6c669cf3fba6770\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-f940482d4b81d054b0e01f459d0f6664\",\"verify_result\":\"PASS\"}",
      "id": 62,
      "target_id": "CX-57b16749dc90",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261020-9ff305"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-20 15:18:30.497",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20261020-9ff305\"}",
      "id": 61,
      "target_id": "CX-57b16749dc90",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261020-9ff305"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-20 15:18:30.497",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20261020-9ff305\"}",
      "id": 60,
      "target_id": "CX-57b16749dc90",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261020-9ff305"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-20 15:18:30.497",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20261020-9ff305\"}",
      "id": 59,
      "target_id": "CX-57b16749dc90",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261020-9ff305"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-20 15:18:30.497",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20261020-9ff305\"}",
      "id": 58,
      "target_id": "CX-57b16749dc90",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261020-9ff305"
     }
    ],
    "total": 77
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.514",
   "trace_id": "TRACE-20261020-2c2b80"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-b1a94a"
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
      "created_at": "2026-10-20 15:18:30.516",
      "cross_tx_id": "CX-461597365854",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 2,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-bd0714d648a172b28fafb14bb403a298",
      "reg_record_id": "REGREC-9866abbbb124",
      "reg_relay_tx_id": "CHAINMAKER-e9c7f40245de687a69ebb90cb1c59ed7",
      "retry_of": "",
      "signature": "MGYEIKBXwCg5vAif/o8TfWgyUrudkncE2x5tmROXc9aoWl9/A0IABBQb7SzIxMVVBQDKmC88TUYOBSDrA2H9nOb6Q3KtgV99pnDk97jbl4TiUPdWJ8HRlV4NE6Ck3+L0WsxCQ/tjohQ=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-da01ae6f4e1514fd08081e5ce2e6a25d",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-10-20 15:18:30.519",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-20 15:18:30.494",
      "cross_tx_id": "CX-57b16749dc90",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 2,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-c5a2d8d28c56205e6482b97c8b4f848a",
      "reg_record_id": "REGREC-2e163b93821a",
      "reg_relay_tx_id": "CHAINMAKER-f2804b66c4b75ebb8757e34f1354d68d",
      "retry_of": "",
      "signature": "MGYEIEM6hjsJ5ss7xj5j/DCw9LoYrqWQUKdr9cJ2i0PDy9vwA0IABF2jSx1rICeuTYucdzhpa4EWWt/h77HFGYFN3EGkagx+PaMA+ltIOugARZ1HHqaDITb7OjuhMnNIQH8FrjkTzhw=",
      "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-333c4e9b14ddf52ef6c669cf3fba6770",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
      "updated_at": "2026-10-20 15:18:30.497",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-20 15:18:30.486",
      "cross_tx_id": "CX-7c3c9f06fef9",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 4,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-6ea3ddb0cadef9c7aed48e5657be7171",
      "reg_record_id": "REGREC-0b404060fd7e",
      "reg_relay_tx_id": "CHAINMAKER-277095c1607adc64889d1e8daaa9aac7",
      "retry_of": "",
      "signature": "MGYEIG/NMXGUYyxf1V71eqCwMv7i762V+ZX6b0oI2jxflYERA0IABGI9O3Ui4qRooiPAh9vip4PFhR5YNrBrI6fVvrtCPAi0m1zydaVvj1RO1PL1mjdSHDolF4uyYWReBt17ChR+GSE=",
      "sm3_hash": "2967cab3c727fff7b1f24a2550e0931dcbe8775fda19e7e3550f3e02f9ff6e2a",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-2f2e11ab56228682edc73f4d2a25fcf0",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-37c0311c11d9206853f72b57261f6c0c",
      "updated_at": "2026-10-20 15:18:30.490",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-8e76ba13bf49",
      "created_at": "2026-10-20 15:18:30.479",
      "cross_tx_id": "CX-be10f8a76f5c",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "67c9856ca7d618d7cb84a1195235655473a6f1a121d2ac2d3ea59a5e1184b496",
      "latency_ms": 2,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-e6e24ed3f1cf1e9dc3171318bb67cb94",
      "reg_record_id": "REGREC-12fe895ffbbd",
      "reg_relay_tx_id": "CHAINMAKER-89aed7621b5abb865f6bb60742880660",
      "retry_of": "",
      "signature": "MGYEIF8PgAeeBuOuz/CYw8Tm+oP3pana/MLQn3gt7sACp1MWA0IABER9LU6f3vO+Vn7DDuSyTKM+H4yUiE6Op+bCA3O99SZxSb5IJE2RoKzsD+HbICIoI7PO/omra8PXvCuZAgdVqig=",
      "sm3_hash": "14690c55d5ec2ca1c4959442587529dba57644fde3b486fd7d4f717c6080baaa",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-6d10ca6fb1144bd32c9b8b40357ed69c",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-d65c29ca3187ec9ce4597ac1482ac039",
      "updated_at": "2026-10-20 15:18:30.482",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20261020-dc6434",
      "created_at": "2026-10-20 15:18:30.475",
      "cross_tx_id": "CX-2a583ba1509b",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "52c3d730908dcdf4139d4f6e0fb2f5175747ce26d14e37f10cd663b5af1db226",
      "latency_ms": 3,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-38d45e17ecb4c433cb245d3136d2c5ba",
      "reg_record_id": "REGREC-356dbc7566f4",
      "reg_relay_tx_id": "CHAINMAKER-d4e0db3f7ef989ed6d596aef5ee6adf6",
      "retry_of": "",
      "signature": "MGYEIDwYNV42DXqtpNCe+dhWI7DJHlHeQdxWGEDD4ObqIo8YA0IABEyugdTbxhrHPbCnC18USyXMN6I/e6EFgI8skYtjt6ZMA6nX4rmZ4E48/lbRZMZ0GfueYuOdOgFDh14c/zY+EyU=",
      "sm3_hash": "b980f3209dee7cf3802ce4a61db605898fa37b171dd934895b21714419560d24",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-1e228f9f91f9d9d237732295da94c6d3",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-87d78474fcc2c04a7e324d78ff774457",
      "updated_at": "2026-10-20 15:18:30.478",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-10-20 15:18:30.461",
      "cross_tx_id": "CX-0b84aab8495d",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 3,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-0ab5756006bb69c02183d104a76359f2",
      "reg_record_id": "REGREC-36516f4b8fa9",
      "reg_relay_tx_id": "CHAINMAKER-797e3f62400be70092a3a0c10e637483",
      "retry_of": "",
      "signature": "MGYEILYCqMWatl/GVSPx6jwT8pzZUTROA4o8IrfDX7erj8KpA0IABDUVijB9l+fnJQ67LHCJBdZhC6mg1j7KoM0smbZZyOxZTlX2TWWdDnFNkV3MXIszUGkwzhxtbwTed0/7fyUqoEQ=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-75a3bc8f51dae3530f78ba7ea8259820",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-10-20 15:18:30.464",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.520",
   "trace_id": "TRACE-20261020-05e7ef"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.541",
   "trace_id": "TRACE-20261020-bd8d78"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-461597365854"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-20 15:18:30.516",
    "cross_tx_id": "CX-461597365854",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 2,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-bd0714d648a172b28fafb14bb403a298",
    "reg_record_id": "REGREC-9866abbbb124",
    "reg_relay_tx_id": "CHAINMAKER-e9c7f40245de687a69ebb90cb1c59ed7",
    "retry_of": "",
    "signature": "MGYEIKBXwCg5vAif/o8TfWgyUrudkncE2x5tmROXc9aoWl9/A0IABBQb7SzIxMVVBQDKmC88TUYOBSDrA2H9nOb6Q3KtgV99pnDk97jbl4TiUPdWJ8HRlV4NE6Ck3+L0WsxCQ/tjohQ=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-da01ae6f4e1514fd08081e5ce2e6a25d",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-20 15:18:30.519",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.519",
   "trace_id": "TRACE-20261020-bcf75f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-10-20 15:18:30.541",
   "trace_id": "TRACE-20261020-4b5d56"
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
    "created_at": "2026-10-20 15:18:30.516",
    "cross_tx_id": "CX-461597365854",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 2,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-bd0714d648a172b28fafb14bb403a298",
    "reg_record_id": "REGREC-9866abbbb124",
    "reg_relay_tx_id": "CHAINMAKER-e9c7f40245de687a69ebb90cb1c59ed7",
    "retry_of": "",
    "signature": "MGYEIKBXwCg5vAif/o8TfWgyUrudkncE2x5tmROXc9aoWl9/A0IABBQb7SzIxMVVBQDKmC88TUYOBSDrA2H9nOb6Q3KtgV99pnDk97jbl4TiUPdWJ8HRlV4NE6Ck3+L0WsxCQ/tjohQ=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-da01ae6f4e1514fd08081e5ce2e6a25d",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-20 15:18:30.519",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.519",
   "trace_id": "TRACE-20261020-61bfa3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-10-20 15:18:30.540",
   "trace_id": "TRACE-20261020-3f7beb"
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
    "generated_at": "2026-10-20 15:18:30.520",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-20 15:18:30.507",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-20 15:18:30.508"
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
   "timestamp": "2026-10-20 15:18:30.521",
   "trace_id": "TRACE-20261020-a9726d"
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
    "generated_at": "2026-10-20 15:18:30.541",
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
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-78d3b6"
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
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20261020-114cd6,RUN-30f14e0408c7,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-10-20 15:18:30.523,2026-10-20 15:18:30.524\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.525",
   "trace_id": "TRACE-20261020-0c5423"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-ffc540"
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
      "completed_at": "2026-10-20 15:18:30.524",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20261020-114cd6",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-30f14e0408c7",
      "scenario": "",
      "started_at": "2026-10-20 15:18:30.523",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.525",
   "trace_id": "TRACE-20261020-1659d2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-36b21c"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-30f14e0408c7"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-20 15:18:30.524",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261020-114cd6",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-30f14e0408c7",
    "scenario": "",
    "started_at": "2026-10-20 15:18:30.523",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.525",
   "trace_id": "TRACE-20261020-a4dfe2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-412b15"
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
    "completed_at": "2026-10-20 15:18:30.524",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261020-114cd6",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-30f14e0408c7",
    "scenario": "",
    "started_at": "2026-10-20 15:18:30.523",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.524",
   "trace_id": "TRACE-20261020-f94a39"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-2e823e"
  }
 },
 {
  "path": "/api/explorer/block",
  "tag": "explorer",
  "summary": "按高度查块详情（越界→6002；能力缺失→2005）",
  "operationId": "explorerBlock",
  "req": {
   "chain": "fabric",
   "height": 1
  },
  "resp": {
   "code": 0,
   "data": {
    "block": {
     "hash": "51d2b6aeb880e7ca007f133034259b2e957ed40541114d45682518e00dd130d3",
     "height": 1,
     "proposer": "fabric-sim-node0",
     "time": "2026-10-20 15:18:30.461",
     "tx_count": 1,
     "tx_ids": [
      "FABRIC-75a3bc8f51dae3530f78ba7ea8259820"
     ]
    },
    "chain": "fabric"
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.526",
   "trace_id": "TRACE-20261020-69e508"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerBlockReq",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-459065"
  }
 },
 {
  "path": "/api/explorer/blocks",
  "tag": "explorer",
  "summary": "最近块列表（新→旧；limit≤0→20、>200→200；能力缺失→2005）",
  "operationId": "explorerBlocks",
  "req": {
   "chain": "fabric",
   "limit": 5
  },
  "resp": {
   "code": 0,
   "data": {
    "blocks": [
     {
      "hash": "80eb61365b9d41b71936ee1397182d91c07f3a12723d8beb7a478d5b3432b5ba",
      "height": 9,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-20 15:18:30.518",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-a2455210a0362fc6e57c3a640c26678f"
      ]
     },
     {
      "hash": "a7966f6b5719112aceff9d74bd99707c1470def61d6c34b947cfe16605015ac5",
      "height": 8,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-20 15:18:30.516",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-da01ae6f4e1514fd08081e5ce2e6a25d"
      ]
     },
     {
      "hash": "6fe17ed4b063cbf0ead9cbbec2365b166f56e9e48c470453afcf3f09bbd57bd7",
      "height": 7,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-20 15:18:30.497",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-f940482d4b81d054b0e01f459d0f6664"
      ]
     },
     {
      "hash": "35403d36940a2a89f920a81e1100f2ada820e5350057e80738132a6b4fa58e3a",
      "height": 6,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-20 15:18:30.489",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-37c0311c11d9206853f72b57261f6c0c"
      ]
     },
     {
      "hash": "830c249f4b32bdd592ced45e0a7d4ee85504730b71e935c1f22810759217a0a8",
      "height": 5,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-20 15:18:30.482",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-d65c29ca3187ec9ce4597ac1482ac039"
      ]
     }
    ],
    "chain": "fabric",
    "height": 9
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.526",
   "trace_id": "TRACE-20261020-e08354"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerBlocksReq",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-bd51d8"
  }
 },
 {
  "path": "/api/explorer/goals",
  "tag": "explorer",
  "summary": "三目标证据芯片实时聚合（芯片①业务留痕口径排除 EXP-*、重试各算一条；测不到→null 绝不写死；wormhole_detected_total 无独立检出字段如实省略）",
  "operationId": "explorerGoals",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "goal1": {
     "chains": [
      {
       "block_height": 28,
       "chain": "chainmaker",
       "consensus": "TBFT（4 节点）",
       "mode": "sim",
       "name": "ChainMaker 监管链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 9,
       "chain": "fabric",
       "consensus": "SMARTBFT（4 orderer）",
       "mode": "sim",
       "name": "Fabric 运营链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 3,
       "chain": "fisco-bcos",
       "consensus": "PBFT（4 sealer）",
       "mode": "sim",
       "name": "FISCO BCOS 管理链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 4,
       "chain": "irita",
       "consensus": "Tendermint BFT（4 验证人）",
       "mode": "sim",
       "name": "IRITA 证照链",
       "node_count": 1,
       "status": "ONLINE"
      }
     ],
     "chains_online": 4,
     "chains_total": 4,
     "crosschain_total": 6,
     "verify_fail": 0,
     "verify_pass": 6,
     "verify_pass_rate_pct": 100
    },
    "goal2": {
     "message_latency_median_ms": 45,
     "messages_total": 1,
     "recovery_latency_median_ms": null,
     "sessions_total": 1,
     "wormhole_events_total": 0
    },
    "goal3": {
     "alerts_total": 1,
     "auth_total": 1,
     "inspect_total": 1,
     "trace_total": 1
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.528",
   "trace_id": "TRACE-20261020-6e1e84"
  },
  "err": {
   "code": 0,
   "data": {
    "goal1": {
     "chains": [
      {
       "block_height": 0,
       "chain": "chainmaker",
       "consensus": "TBFT（4 节点）",
       "mode": "sim",
       "name": "ChainMaker 监管链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 0,
       "chain": "fabric",
       "consensus": "SMARTBFT（4 orderer）",
       "mode": "sim",
       "name": "Fabric 运营链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 0,
       "chain": "fisco-bcos",
       "consensus": "PBFT（4 sealer）",
       "mode": "sim",
       "name": "FISCO BCOS 管理链",
       "node_count": 1,
       "status": "ONLINE"
      },
      {
       "block_height": 0,
       "chain": "irita",
       "consensus": "Tendermint BFT（4 验证人）",
       "mode": "sim",
       "name": "IRITA 证照链",
       "node_count": 1,
       "status": "ONLINE"
      }
     ],
     "chains_online": 4,
     "chains_total": 4,
     "crosschain_total": 0,
     "verify_fail": 0,
     "verify_pass": 0,
     "verify_pass_rate_pct": null
    },
    "goal2": {
     "message_latency_median_ms": null,
     "messages_total": 0,
     "recovery_latency_median_ms": null,
     "sessions_total": 0,
     "wormhole_events_total": 0
    },
    "goal3": {
     "alerts_total": 0,
     "auth_total": 0,
     "inspect_total": 0,
     "trace_total": 0
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-6f623e"
  }
 },
 {
  "path": "/api/explorer/journey",
  "tag": "explorer",
  "summary": "业务对象全链旅程（锚点 mission/pass/uav，缺省按 ID 前缀推断；hops 按 created_at 升序含四段 TxID；summary 仅全 SUCCESS 给 end_to_end_ms；锚点不存在→6002）",
  "operationId": "explorerJourney",
  "req": {
   "anchor_id": "MISSION-2026-001",
   "anchor_kind": "mission"
  },
  "resp": {
   "code": 0,
   "data": {
    "anchor": {
     "id": "MISSION-2026-001",
     "kind": "mission",
     "status": "APPROVED"
    },
    "hops": [
     {
      "business_id": "APP-20261020-dc6434",
      "created_at": "2026-10-20 15:18:30.475",
      "cross_tx_id": "CX-2a583ba1509b",
      "final_target_chain": "fisco-bcos",
      "latency_ms": 3,
      "message_type": "MISSION_APPLICATION",
      "segments": {
       "reg_receive_tx_id": "CHAINMAKER-38d45e17ecb4c433cb245d3136d2c5ba",
       "reg_relay_tx_id": "CHAINMAKER-d4e0db3f7ef989ed6d596aef5ee6adf6",
       "source_tx_id": "FABRIC-1e228f9f91f9d9d237732295da94c6d3",
       "target_tx_id": "FISCO-BCOS-87d78474fcc2c04a7e324d78ff774457"
      },
      "seq": 1,
      "sm3_hash": "b980f3209dee7cf3802ce4a61db605898fa37b171dd934895b21714419560d24",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "status": "SUCCESS",
      "updated_at": "2026-10-20 15:18:30.478",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-8e76ba13bf49",
      "created_at": "2026-10-20 15:18:30.479",
      "cross_tx_id": "CX-be10f8a76f5c",
      "final_target_chain": "fabric",
      "latency_ms": 2,
      "message_type": "MISSION_REVIEW_RESULT",
      "segments": {
       "reg_receive_tx_id": "CHAINMAKER-e6e24ed3f1cf1e9dc3171318bb67cb94",
       "reg_relay_tx_id": "CHAINMAKER-89aed7621b5abb865f6bb60742880660",
       "source_tx_id": "FISCO-BCOS-6d10ca6fb1144bd32c9b8b40357ed69c",
       "target_tx_id": "FABRIC-d65c29ca3187ec9ce4597ac1482ac039"
      },
      "seq": 2,
      "sm3_hash": "14690c55d5ec2ca1c4959442587529dba57644fde3b486fd7d4f717c6080baaa",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "status": "SUCCESS",
      "updated_at": "2026-10-20 15:18:30.482",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-20 15:18:30.486",
      "cross_tx_id": "CX-7c3c9f06fef9",
      "final_target_chain": "fabric",
      "latency_ms": 4,
      "message_type": "FLIGHT_PASS",
      "segments": {
       "reg_receive_tx_id": "CHAINMAKER-6ea3ddb0cadef9c7aed48e5657be7171",
       "reg_relay_tx_id": "CHAINMAKER-277095c1607adc64889d1e8daaa9aac7",
       "source_tx_id": "IRITA-2f2e11ab56228682edc73f4d2a25fcf0",
       "target_tx_id": "FABRIC-37c0311c11d9206853f72b57261f6c0c"
      },
      "seq": 3,
      "sm3_hash": "2967cab3c727fff7b1f24a2550e0931dcbe8775fda19e7e3550f3e02f9ff6e2a",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "status": "SUCCESS",
      "updated_at": "2026-10-20 15:18:30.490",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-20 15:18:30.494",
      "cross_tx_id": "CX-57b16749dc90",
      "final_target_chain": "fabric",
      "latency_ms": 2,
      "message_type": "PASS_REVOKE",
      "segments": {
       "reg_receive_tx_id": "CHAINMAKER-c5a2d8d28c56205e6482b97c8b4f848a",
       "reg_relay_tx_id": "CHAINMAKER-f2804b66c4b75ebb8757e34f1354d68d",
       "source_tx_id": "IRITA-333c4e9b14ddf52ef6c669cf3fba6770",
       "target_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664"
      },
      "seq": 4,
      "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "status": "SUCCESS",
      "updated_at": "2026-10-20 15:18:30.497",
      "verify_result": "PASS"
     }
    ],
    "objects": [
     {
      "id": "APP-20261020-dc6434",
      "kind": "application",
      "status": "APPROVED"
     },
     {
      "id": "MISSION-2026-001",
      "kind": "mission",
      "status": "APPROVED"
     },
     {
      "id": "PASS-2026-001",
      "kind": "pass",
      "status": "REVOKED"
     },
     {
      "id": "REV-8e76ba13bf49",
      "kind": "review",
      "status": "APPROVED"
     }
    ],
    "summary": {
     "end_to_end_ms": 22,
     "first_at": "2026-10-20 15:18:30.475",
     "hop_count": 4,
     "last_at": "2026-10-20 15:18:30.494",
     "success_count": 4,
     "verify_pass": 4,
     "verify_total": 4
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.527",
   "trace_id": "TRACE-20261020-7cecab"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerJourneyReq",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-5ae6aa"
  }
 },
 {
  "path": "/api/explorer/nodes",
  "tag": "explorer",
  "summary": "节点列表（source 如实标注 rpc/static+probe/sim；能力缺失→2005）",
  "operationId": "explorerNodes",
  "req": {
   "chain": "fabric"
  },
  "resp": {
   "code": 0,
   "data": {
    "chain": "fabric",
    "nodes": [
     {
      "address": "in-process",
      "name": "fabric-sim-node0",
      "online": true,
      "role": "sim",
      "source": "sim"
     }
    ]
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.526",
   "trace_id": "TRACE-20261020-29b2d6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerNodesReq",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-7dd88b"
  }
 },
 {
  "path": "/api/explorer/overview",
  "tag": "explorer",
  "summary": "四链总览（name/mode/status/consensus/node_count/block_height；能力缺失如实 0，mode 按 Resettable 判定 sim|real）",
  "operationId": "explorerOverview",
  "req": {},
  "resp": {
   "code": 0,
   "data": {
    "chains": [
     {
      "block_height": 28,
      "chain": "chainmaker",
      "consensus": "TBFT（4 节点）",
      "mode": "sim",
      "name": "ChainMaker 监管链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 9,
      "chain": "fabric",
      "consensus": "SMARTBFT（4 orderer）",
      "mode": "sim",
      "name": "Fabric 运营链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 3,
      "chain": "fisco-bcos",
      "consensus": "PBFT（4 sealer）",
      "mode": "sim",
      "name": "FISCO BCOS 管理链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 4,
      "chain": "irita",
      "consensus": "Tendermint BFT（4 验证人）",
      "mode": "sim",
      "name": "IRITA 证照链",
      "node_count": 1,
      "status": "ONLINE"
     }
    ],
    "count": 4
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.526",
   "trace_id": "TRACE-20261020-f8ed2b"
  },
  "err": {
   "code": 0,
   "data": {
    "chains": [
     {
      "block_height": 0,
      "chain": "chainmaker",
      "consensus": "TBFT（4 节点）",
      "mode": "sim",
      "name": "ChainMaker 监管链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 0,
      "chain": "fabric",
      "consensus": "SMARTBFT（4 orderer）",
      "mode": "sim",
      "name": "Fabric 运营链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 0,
      "chain": "fisco-bcos",
      "consensus": "PBFT（4 sealer）",
      "mode": "sim",
      "name": "FISCO BCOS 管理链",
      "node_count": 1,
      "status": "ONLINE"
     },
     {
      "block_height": 0,
      "chain": "irita",
      "consensus": "Tendermint BFT（4 验证人）",
      "mode": "sim",
      "name": "IRITA 证照链",
      "node_count": 1,
      "status": "ONLINE"
     }
    ],
    "count": 4
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.542",
   "trace_id": "TRACE-20261020-b4f312"
  }
 },
 {
  "path": "/api/explorer/tx",
  "tag": "explorer",
  "summary": "按 TxID 链上直查（走既有 QueryTx，不依赖 BlockQuerier；查无→6002）",
  "operationId": "explorerTx",
  "req": {
   "chain": "fabric",
   "tx_id": "FABRIC-a2455210a0362fc6e57c3a640c26678f"
  },
  "resp": {
   "code": 0,
   "data": {
    "chain": "fabric",
    "tx": {
     "block_num": 9,
     "status": 0,
     "timestamp": "2026-10-20 15:18:30.518",
     "tx_id": "FABRIC-a2455210a0362fc6e57c3a640c26678f"
    }
   },
   "message": "success",
   "timestamp": "2026-10-20 15:18:30.526",
   "trace_id": "TRACE-20261020-480040"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerTxReq",
   "timestamp": "2026-10-20 15:18:30.543",
   "trace_id": "TRACE-20261020-3ac571"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "UOM登记", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "遥测", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验", "explorer"];
