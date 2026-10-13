// 由 docs/apifox/skytrust-backend.openapi.json 生成（78 端点全量，含录制样例）。
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
   "timestamp": "2026-10-13 17:31:10.647",
   "trace_id": "TRACE-20261013-50c713"
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
   "timestamp": "2026-10-13 17:31:10.801",
   "trace_id": "TRACE-20261013-de4bbe"
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
   "timestamp": "2026-10-13 17:31:10.646",
   "trace_id": "TRACE-20261013-10793e"
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
   "timestamp": "2026-10-13 17:31:10.800",
   "trace_id": "TRACE-20261013-9cc9b5"
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
   "timestamp": "2026-10-13 17:31:10.646",
   "trace_id": "TRACE-20261013-6901a1"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.800",
   "trace_id": "TRACE-20261013-3042ba"
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
   "timestamp": "2026-10-13 17:31:10.647",
   "trace_id": "TRACE-20261013-52d7cd"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-10-13 17:31:10.801",
   "trace_id": "TRACE-20261013-2119dd"
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
   "timestamp": "2026-10-13 17:31:10.648",
   "trace_id": "TRACE-20261013-08a3b2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-10-13 17:31:10.801",
   "trace_id": "TRACE-20261013-c39e9f"
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
    "signature": "MGYEIB9vDm81UkF5YiWfct5ROeKvdXR5mfekJkU1CdEvQnQmA0IABJ6tEVfi4oWEGSZ2WUJbKqEAkFqhZdoh89AxjzG5Cn5Xbn8Ao8VqzBjILH9B7FueAUVLkj5Nkc1zbd4RoT2DSp4=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.648",
   "trace_id": "TRACE-20261013-1c462f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-10-13 17:31:10.803",
   "trace_id": "TRACE-20261013-5d5967"
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
   "timestamp": "2026-10-13 17:31:10.649",
   "trace_id": "TRACE-20261013-a78f27"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-10-13 17:31:10.804",
   "trace_id": "TRACE-20261013-0080ba"
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
   "timestamp": "2026-10-13 17:31:10.650",
   "trace_id": "TRACE-20261013-4fc189"
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
   "timestamp": "2026-10-13 17:31:10.811",
   "trace_id": "TRACE-20261013-9d7cd2"
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
    "reset_at": "2026-10-13 17:31:10.800",
    "started_at": "2026-10-13 17:31:10.799",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.800",
   "trace_id": "TRACE-20261013-10ec9d"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-13 17:31:10.833",
    "started_at": "2026-10-13 17:31:10.833",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.833",
   "trace_id": "TRACE-20261013-4f40ed"
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
      "created_at": "2026-10-13 17:31:10.634",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.634"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-10-13 17:31:10.634",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.634"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-10-13 17:31:10.634",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.634"
     },
     {
      "adapter_type": "",
      "created_at": "2026-10-13 17:31:10.651",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.651"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.652",
   "trace_id": "TRACE-20261013-87715d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.812",
   "trace_id": "TRACE-20261013-5ec176"
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
    "created_at": "2026-10-13 17:31:10.651",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 17:31:10.651"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.651",
   "trace_id": "TRACE-20261013-59a30e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-10-13 17:31:10.812",
   "trace_id": "TRACE-20261013-996ed1"
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
      "created_at": "2026-10-13 17:31:10.634",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.634"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-10-13 17:31:10.634",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.634"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-10-13 17:31:10.635",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-10-13 17:31:10.655",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 17:31:10.655"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.656",
   "trace_id": "TRACE-20261013-abe8cc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.812",
   "trace_id": "TRACE-20261013-959f4b"
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
    "created_at": "2026-10-13 17:31:10.655",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 17:31:10.655"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.655",
   "trace_id": "TRACE-20261013-2f5554"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-10-13 17:31:10.812",
   "trace_id": "TRACE-20261013-902631"
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
    "created_at": "2026-10-13 17:31:10.657",
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
   "timestamp": "2026-10-13 17:31:10.657",
   "trace_id": "TRACE-20261013-55b7a2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-830715"
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
      "created_at": "2026-10-13 17:31:10.642",
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
      "created_at": "2026-10-13 17:31:10.643",
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
      "created_at": "2026-10-13 17:31:10.643",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.657",
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
   "timestamp": "2026-10-13 17:31:10.658",
   "trace_id": "TRACE-20261013-de6581"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-7c5578"
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
     "created_at": "2026-10-13 17:31:10.660",
     "expires_at": "2028-10-13 17:31:10.660",
     "id_number": "420100199001010011",
     "issued_at": "2026-10-13 17:31:10.660",
     "license_id": "PIL-76112e632be7",
     "license_no": "UAV-PILOT-2026-7727",
     "name": "文档样例操控员",
     "signature": "MGYEIDf7QSeMrZrpuwuwWXV4bDRJFHykherY9hG+exE9cGQaA0IABIrHlz3lxaFSqCSD9vqDjcrIRRsAWGUefT54PysYTgveBZmKqqWfw60/et0wMtne8FJ9cBb7whgj3BHNSbKe7BY=",
     "status": "ISSUED",
     "updated_at": "2026-10-13 17:31:10.660"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.661",
   "trace_id": "TRACE-20261013-dbe388"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotApplyReq",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-caf2a7"
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
      "created_at": "2026-10-13 17:31:10.660",
      "expires_at": "2028-10-13 17:31:10.660",
      "id_number": "420100199001010011",
      "issued_at": "2026-10-13 17:31:10.660",
      "license_id": "PIL-76112e632be7",
      "license_no": "UAV-PILOT-2026-7727",
      "name": "文档样例操控员",
      "signature": "MGYEIDf7QSeMrZrpuwuwWXV4bDRJFHykherY9hG+exE9cGQaA0IABIrHlz3lxaFSqCSD9vqDjcrIRRsAWGUefT54PysYTgveBZmKqqWfw60/et0wMtne8FJ9cBb7whgj3BHNSbKe7BY=",
      "status": "ISSUED",
      "updated_at": "2026-10-13 17:31:10.660"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.662",
   "trace_id": "TRACE-20261013-535c09"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-4c2554"
  }
 },
 {
  "path": "/api/pilot/query",
  "tag": "UOM登记",
  "summary": "执照查询（不存在→7002）",
  "operationId": "pilotQuery",
  "req": {
   "license_id": "PIL-76112e632be7"
  },
  "resp": {
   "code": 0,
   "data": {
    "category": "多旋翼",
    "created_at": "2026-10-13 17:31:10.660",
    "expires_at": "2028-10-13 17:31:10.660",
    "id_number": "420100199001010011",
    "issued_at": "2026-10-13 17:31:10.660",
    "license_id": "PIL-76112e632be7",
    "license_no": "UAV-PILOT-2026-7727",
    "name": "文档样例操控员",
    "signature": "MGYEIDf7QSeMrZrpuwuwWXV4bDRJFHykherY9hG+exE9cGQaA0IABIrHlz3lxaFSqCSD9vqDjcrIRRsAWGUefT54PysYTgveBZmKqqWfw60/et0wMtne8FJ9cBb7whgj3BHNSbKe7BY=",
    "status": "ISSUED",
    "updated_at": "2026-10-13 17:31:10.660"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.662",
   "trace_id": "TRACE-20261013-fde629"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotQueryReq",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-582dac"
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
      "created_at": "2026-10-13 17:31:10.658",
      "id_number": "91420100DOCAIR01X",
      "name": "文档样例物流企业",
      "status": "REGISTERED",
      "subject_id": "RNS-d0deb555d645",
      "subject_type": "ENTERPRISE",
      "updated_at": "2026-10-13 17:31:10.658"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.659",
   "trace_id": "TRACE-20261013-3e9a72"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-a6996a"
  }
 },
 {
  "path": "/api/realname/query",
  "tag": "UOM登记",
  "summary": "实名主体查询（不存在→7001）",
  "operationId": "realnameQuery",
  "req": {
   "subject_id": "RNS-d0deb555d645"
  },
  "resp": {
   "code": 0,
   "data": {
    "contact": "027-88880001",
    "created_at": "2026-10-13 17:31:10.658",
    "id_number": "91420100DOCAIR01X",
    "name": "文档样例物流企业",
    "status": "REGISTERED",
    "subject_id": "RNS-d0deb555d645",
    "subject_type": "ENTERPRISE",
    "updated_at": "2026-10-13 17:31:10.658"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.659",
   "trace_id": "TRACE-20261013-46204f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameQueryReq",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-512eee"
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
     "created_at": "2026-10-13 17:31:10.658",
     "id_number": "91420100DOCAIR01X",
     "name": "文档样例物流企业",
     "status": "REGISTERED",
     "subject_id": "RNS-d0deb555d645",
     "subject_type": "ENTERPRISE",
     "updated_at": "2026-10-13 17:31:10.658"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.658",
   "trace_id": "TRACE-20261013-5797b6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameRegisterReq",
   "timestamp": "2026-10-13 17:31:10.813",
   "trace_id": "TRACE-20261013-732bb2"
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
      "created_at": "2026-10-13 17:31:10.635",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260001",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "created_at": "2026-10-13 17:31:10.635",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260002",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "created_at": "2026-10-13 17:31:10.635",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260003",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "created_at": "2026-10-13 17:31:10.635",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260004",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "created_at": "2026-10-13 17:31:10.635",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260005",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-10-13 17:31:10.635"
     },
     {
      "created_at": "2026-10-13 17:31:10.636",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260006",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-10-13 17:31:10.636"
     },
     {
      "created_at": "2026-10-13 17:31:10.636",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260007",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-10-13 17:31:10.636"
     },
     {
      "created_at": "2026-10-13 17:31:10.664",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "realname_id": "RNS-d0deb555d645",
      "registration_mark": "UAS-40528122",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-10-13 17:31:10.671"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.673",
   "trace_id": "TRACE-20261013-fdd577"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.816",
   "trace_id": "TRACE-20261013-d1c69e"
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
    "created_at": "2026-10-13 17:31:10.664",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-d0deb555d645",
    "registration_mark": "UAS-40528122",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 17:31:10.671"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.673",
   "trace_id": "TRACE-20261013-99a047"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-10-13 17:31:10.816",
   "trace_id": "TRACE-20261013-dcbba3"
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
   "realname_id": "RNS-d0deb555d645",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-10-13 17:31:10.666",
     "cross_tx_id": "CX-c8fb06612c4f",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 5,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-f756e85548f744cb9119d7d8d7335375",
     "reg_record_id": "REGREC-eeacd31ad102",
     "reg_relay_tx_id": "CHAINMAKER-0ac13462590307a98f9b2a29ef1afed5",
     "retry_of": "",
     "signature": "MGYEIIZrOPhSTuG9WwWpuxRp8MYxI09C2QIoi5ma4cqFW1M3A0IABDrubyhnTDsuWb+5fHNfZOZ7CgCE/XxeUZY0kuOUuWPXorTgdWEwemV4mHosjXQyr0grLFCYE2QX/KV5ooObl10=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-103320ae0cf271b309546f6364912742",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-10-13 17:31:10.671",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-10-13 17:31:10.664",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-d0deb555d645",
     "registration_mark": "UAS-40528122",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 17:31:10.671"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.672",
   "trace_id": "TRACE-20261013-8402fc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-10-13 17:31:10.816",
   "trace_id": "TRACE-20261013-2acbab"
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
    "created_at": "2026-10-13 17:31:10.664",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-d0deb555d645",
    "registration_mark": "UAS-40528122",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 17:31:10.675"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.676",
   "trace_id": "TRACE-20261013-0c2bb2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-10-13 17:31:10.818",
   "trace_id": "TRACE-20261013-73c4e1"
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
     "created_at": "2026-10-13 17:31:10.664",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-d0deb555d645",
     "registration_mark": "UAS-40528122",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 17:31:10.674"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.675",
   "trace_id": "TRACE-20261013-7281ec"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-10-13 17:31:10.817",
   "trace_id": "TRACE-20261013-fd9b9a"
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
    "created_at": "2026-10-13 17:31:10.683",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIDr5voyFgm/Xj6+Au+dw7Rfhw42YSnHFKjQczTJ/bwXqA0IABG29ODaLaxnT1brQ3kE7vr7OyBwlgSqs9FUwQOiSWtH1h678hg5GFgv70lu4xY+s4XFfWf4E5FE3NwSDnclsGA8=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 17:31:10.683",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.685",
   "trace_id": "TRACE-20261013-c623ce"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-10-13 17:31:10.819",
   "trace_id": "TRACE-20261013-647dd8"
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
      "created_at": "2026-10-13 17:31:10.683",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "pilot_license_id": "",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIDr5voyFgm/Xj6+Au+dw7Rfhw42YSnHFKjQczTJ/bwXqA0IABG29ODaLaxnT1brQ3kE7vr7OyBwlgSqs9FUwQOiSWtH1h678hg5GFgv70lu4xY+s4XFfWf4E5FE3NwSDnclsGA8=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 17:31:10.683",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.688",
   "trace_id": "TRACE-20261013-3cb1ec"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.820",
   "trace_id": "TRACE-20261013-ee7390"
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
    "created_at": "2026-10-13 17:31:10.683",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIDr5voyFgm/Xj6+Au+dw7Rfhw42YSnHFKjQczTJ/bwXqA0IABG29ODaLaxnT1brQ3kE7vr7OyBwlgSqs9FUwQOiSWtH1h678hg5GFgv70lu4xY+s4XFfWf4E5FE3NwSDnclsGA8=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 17:31:10.683",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.686",
   "trace_id": "TRACE-20261013-b54c8f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-10-13 17:31:10.820",
   "trace_id": "TRACE-20261013-7e50a6"
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
     "application_id": "APP-20261013-f5dbfb",
     "created_at": "2026-10-13 17:31:10.691",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEIBsLudl4Zmsl4nwCd2OgyQyfQkHy9REx2UMEhEEZyX8WA0IABKygkeyDD27sVmcEO3XpSNUKFjSfzni9AtUUl2tJCRp8WCetJuo+ASR21cyY9yTGdIIAuS7rE+6GzwDFxvuL4a8=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-750ae16aee3ef5fa27c009844d9f5d09",
     "status": "RELAYED",
     "updated_at": "2026-10-13 17:31:10.701"
    },
    "crosschain": {
     "business_id": "APP-20261013-f5dbfb",
     "created_at": "2026-10-13 17:31:10.692",
     "cross_tx_id": "CX-e3816917ae70",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "5cfb62d602579799bbed070c4d28444af72267b9b5e3b688da5b54ae2903c963",
     "latency_ms": 8,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-b31ae544533bccc4739af754c77413e7",
     "reg_record_id": "REGREC-e2d7e397900d",
     "reg_relay_tx_id": "CHAINMAKER-517f13d3edd899463b75689c80b5953f",
     "retry_of": "",
     "signature": "MGYEIFZk86dFE7JO3xirUCWptm5n7Sh8wV7VQkUNuAlXoRqxA0IABFQlhp/XgEmEeSw1Om4R0fSc9/pNk+vmqVifvzHgq2wCa/fUF/mxS+Vqjn/QQv3wTvpmCcFaBsRLooUXGUxchW8=",
     "sm3_hash": "8102ade235547f5822b5b78011163d17116f7c43a3d1b4c463f626123b687ded",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-750ae16aee3ef5fa27c009844d9f5d09",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-76036ce5c759d819f66531dbd7f76aad",
     "updated_at": "2026-10-13 17:31:10.701",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.701",
   "trace_id": "TRACE-20261013-1cf3e8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-10-13 17:31:10.821",
   "trace_id": "TRACE-20261013-d18feb"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20261013-f5dbfb"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20261013-f5dbfb",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-79a8293b244b",
      "review_time": "2026-10-13 17:31:10.703",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.712",
   "trace_id": "TRACE-20261013-0c0f78"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-10-13 17:31:10.822",
   "trace_id": "TRACE-20261013-903f8d"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20261013-f5dbfb",
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
     "business_id": "REV-79a8293b244b",
     "created_at": "2026-10-13 17:31:10.704",
     "cross_tx_id": "CX-365b0f9cbb46",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "4c18431234fd3b549a48a00972e2d086385e226a0cbe773ac737ffddb32d391a",
     "latency_ms": 6,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-637935e37811c9dfd2b8f08d401dd33e",
     "reg_record_id": "REGREC-a9f8c7f9b5b2",
     "reg_relay_tx_id": "CHAINMAKER-1ac31be4a00a1ff93144fa39d171df14",
     "retry_of": "",
     "signature": "MGYEIB4QGZe39GvN39chWCDoOTS1xYRfBBUeYXx3p27mOc4pA0IABEu/ouTTJgTcGuYD/E0UI0KPT0iRH3n6UHIinJGbK7rld1YYrswKQApnpNRLEO2hgvDx5fgPmBq9Okd1EOye7Pc=",
     "sm3_hash": "676cfca5c5f3819807e4e2efdfd8af63228ffe3b6e316aa246104e913e4ad7d5",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-b0d7e35c40608252e5b96e73bd92f66a",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-d621d79fd8b6ed79b85b31b34c0b3416",
     "updated_at": "2026-10-13 17:31:10.710",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 17:31:10.683",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIDr5voyFgm/Xj6+Au+dw7Rfhw42YSnHFKjQczTJ/bwXqA0IABG29ODaLaxnT1brQ3kE7vr7OyBwlgSqs9FUwQOiSWtH1h678hg5GFgv70lu4xY+s4XFfWf4E5FE3NwSDnclsGA8=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 17:31:10.710",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20261013-f5dbfb",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-79a8293b244b",
     "review_time": "2026-10-13 17:31:10.703",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.711",
   "trace_id": "TRACE-20261013-4a35bf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-10-13 17:31:10.822",
   "trace_id": "TRACE-20261013-10bf22"
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
   "timestamp": "2026-10-13 17:31:10.712",
   "trace_id": "TRACE-20261013-23fe41"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-10-13 17:31:10.822",
   "trace_id": "TRACE-20261013-95725c"
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
   "timestamp": "2026-10-13 17:31:10.713",
   "trace_id": "TRACE-20261013-854ed3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-d90976"
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
   "valid_from": "2026-10-13 16:31:10.633",
   "valid_to": "2026-10-13 18:31:10.633"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-13 17:31:10.716",
     "cross_tx_id": "CX-835f1d9d57e4",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 5,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-7ee1bdd9cc9e38c82611097e8023ce83",
     "reg_record_id": "REGREC-58c2275f2d51",
     "reg_relay_tx_id": "CHAINMAKER-8e77445bf74ac0ccddbbf7c7ba7f2a34",
     "retry_of": "",
     "signature": "MGYEIGf33i877c1hXB9bOIbtg+N39y4yqZ8us1SdyEhNQu8cA0IABEJJxgOb4IqcMMmtgKuoWCbQHkqxRqitSf7lm681o7dzRc3M97jm8udeesgwKYw1EWBURXaQ3tiLGAKXMXMVhac=",
     "sm3_hash": "037cbd3884445d390a5556cdb4cd861da63876944e8cde74b2258e10a720af1e",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-f151732fed76ccb240c01cdc29d5bf67",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-5f4adf3593984ccf39998f0d454718e9",
     "updated_at": "2026-10-13 17:31:10.722",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-10-13 17:31:10.714",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIfNO2TFgkE9htR/F/KW5S8JhAfQsssgGCCcpkf6uyEkA0IABKRzfDnBa7FSKDEA+7quITcDrRK3i1iWCwzO5Aul8s6OL7ct3sHecLwgz7fAQTxWEt4fcttFWugNhL8ZwLCz6eg=",
     "sm3_hash": "b51fca1692cccd6f5d71364a2a4b92080933b49d5b8d9038310b513a028986f4",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 17:31:10.722",
     "valid_from": "2026-10-13 16:31:10.633",
     "valid_to": "2026-10-13 18:31:10.633"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.723",
   "trace_id": "TRACE-20261013-8f4a87"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-bebdda"
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
      "created_at": "2026-10-13 17:31:10.714",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIIfNO2TFgkE9htR/F/KW5S8JhAfQsssgGCCcpkf6uyEkA0IABKRzfDnBa7FSKDEA+7quITcDrRK3i1iWCwzO5Aul8s6OL7ct3sHecLwgz7fAQTxWEt4fcttFWugNhL8ZwLCz6eg=",
      "sm3_hash": "b51fca1692cccd6f5d71364a2a4b92080933b49d5b8d9038310b513a028986f4",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 17:31:10.722",
      "valid_from": "2026-10-13 16:31:10.633",
      "valid_to": "2026-10-13 18:31:10.633"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.725",
   "trace_id": "TRACE-20261013-213e45"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-83f8d1"
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
    "created_at": "2026-10-13 17:31:10.714",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIIfNO2TFgkE9htR/F/KW5S8JhAfQsssgGCCcpkf6uyEkA0IABKRzfDnBa7FSKDEA+7quITcDrRK3i1iWCwzO5Aul8s6OL7ct3sHecLwgz7fAQTxWEt4fcttFWugNhL8ZwLCz6eg=",
    "sm3_hash": "b51fca1692cccd6f5d71364a2a4b92080933b49d5b8d9038310b513a028986f4",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 17:31:10.722",
    "valid_from": "2026-10-13 16:31:10.633",
    "valid_to": "2026-10-13 18:31:10.633"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.724",
   "trace_id": "TRACE-20261013-999a9c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-4b968b"
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
     "created_at": "2026-10-13 17:31:10.731",
     "cross_tx_id": "CX-b14b2debe539",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 5,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-8d94abfb9d64ab77de44afa13a801196",
     "reg_record_id": "REGREC-1dbe928a1b3c",
     "reg_relay_tx_id": "CHAINMAKER-5d77a5c879786671c8ee4c282700a114",
     "retry_of": "",
     "signature": "MGYEIHGh5pAwIUWAOYIpG9v+lgJurJZWEIDEgDptlz8bb8JaA0IABIsfWDserRVBwZwidr6SwYioFHD2qsvOPftXUbCUMgZ4Uant/9AROWJVI0Fs69KghlGoPP4jGUc9413cA/hKXoM=",
     "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
     "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
     "source_chain": "irita",
     "source_chain_tx_id": "IRITA-fa3f785c18c1489d7c4f61d9e9141f40",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
     "updated_at": "2026-10-13 17:31:10.737",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-10-13 17:31:10.714",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIfNO2TFgkE9htR/F/KW5S8JhAfQsssgGCCcpkf6uyEkA0IABKRzfDnBa7FSKDEA+7quITcDrRK3i1iWCwzO5Aul8s6OL7ct3sHecLwgz7fAQTxWEt4fcttFWugNhL8ZwLCz6eg=",
     "sm3_hash": "b51fca1692cccd6f5d71364a2a4b92080933b49d5b8d9038310b513a028986f4",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 17:31:10.727",
     "valid_from": "2026-10-13 16:31:10.633",
     "valid_to": "2026-10-13 18:31:10.633"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.737",
   "trace_id": "TRACE-20261013-3894bc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-4963af"
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
   "timestamp": "2026-10-13 17:31:10.727",
   "trace_id": "TRACE-20261013-d5d0f8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 17:31:10.823",
   "trace_id": "TRACE-20261013-06ebc0"
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.739",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.644",
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
   "timestamp": "2026-10-13 17:31:10.740",
   "trace_id": "TRACE-20261013-01a57c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-81d666"
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
    "created_at": "2026-10-13 17:31:10.739",
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
   "timestamp": "2026-10-13 17:31:10.739",
   "trace_id": "TRACE-20261013-0ebe8f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-10-13 17:31:10.824",
   "trace_id": "TRACE-20261013-53b989"
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.644",
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.645",
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
      "created_at": "2026-10-13 17:31:10.644",
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
   "timestamp": "2026-10-13 17:31:10.738",
   "trace_id": "TRACE-20261013-74c6f1"
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
      "created_at": "2026-10-13 17:31:10.811",
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
      "created_at": "2026-10-13 17:31:10.810",
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
      "created_at": "2026-10-13 17:31:10.810",
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
      "created_at": "2026-10-13 17:31:10.810",
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
      "created_at": "2026-10-13 17:31:10.810",
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
      "created_at": "2026-10-13 17:31:10.811",
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
      "created_at": "2026-10-13 17:31:10.811",
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
      "created_at": "2026-10-13 17:31:10.810",
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
   "timestamp": "2026-10-13 17:31:10.824",
   "trace_id": "TRACE-20261013-239a16"
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
   "session_id": "SESS-eafcd076d1ce"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-13 17:31:10.742",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-eafcd076d1ce",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 17:31:10.754"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.755",
   "trace_id": "TRACE-20261013-0477a3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-be344e"
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
      "created_at": "2026-10-13 17:31:10.742",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-eafcd076d1ce",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 17:31:10.742"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.743",
   "trace_id": "TRACE-20261013-6eedbd"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-cec3e2"
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
     "nonce": "NONCE-d2d86d9c736d6d69029c1d06ea53fd3d",
     "signature": "MGYEIDxyN1Cp5fXDIaiR8fcQduPKrATKtx3S1mC37TmhNoEGA0IABFXVjBEvermBbmF57XCPzyQYP8Qu5RUy/WAsHuYaHX1RXkTzErvmnIY2t+uD7+ebU9r2+wQVRJBOlcuuRHm2k04=",
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
     "created_at": "2026-10-13 17:31:10.742",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-eafcd076d1ce",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 17:31:10.742"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.743",
   "trace_id": "TRACE-20261013-4cd348"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-6b299e"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-eafcd076d1ce"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-13 17:31:10.745",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIBuFstr4WWIzZF4qUaSPmfPXiwrmGAnpuMHXOeCwLpMZA0IABGzhU2fTHd1Ca+C0pJKV5yyk7gEUWLydAWu9S5N0fxxhriLLNhdXrh8RrBsCejD2XYGcRgsw4JMiiPcM6hrhw3s=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-2118bb6c1bbba3bc",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-eafcd076d1ce",
      "sm3_hash": "8c48d10d13ec7532f82a9a359dbc05665550279c80defdba59891d00b715fb51",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-10-13 17:31:10.744"
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
   "timestamp": "2026-10-13 17:31:10.746",
   "trace_id": "TRACE-20261013-7e14f4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-542723"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-eafcd076d1ce",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-10-13 17:31:10.745",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIBuFstr4WWIzZF4qUaSPmfPXiwrmGAnpuMHXOeCwLpMZA0IABGzhU2fTHd1Ca+C0pJKV5yyk7gEUWLydAWu9S5N0fxxhriLLNhdXrh8RrBsCejD2XYGcRgsw4JMiiPcM6hrhw3s=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-2118bb6c1bbba3bc",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-eafcd076d1ce",
     "sm3_hash": "8c48d10d13ec7532f82a9a359dbc05665550279c80defdba59891d00b715fb51",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-10-13 17:31:10.744"
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
   "timestamp": "2026-10-13 17:31:10.746",
   "trace_id": "TRACE-20261013-4f125f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-599cac"
  }
 },
 {
  "path": "/api/telemetry/latest",
  "tag": "遥测",
  "summary": "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）",
  "operationId": "telemetryLatest",
  "req": {
   "session_id": "SESS-eafcd076d1ce"
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 17:31:10.747",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 17:31:10.747",
     "seq": 1,
     "session_id": "SESS-eafcd076d1ce",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-2511cd7bf738",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.749",
   "trace_id": "TRACE-20261013-e26446"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-1048dd"
  }
 },
 {
  "path": "/api/telemetry/list",
  "tag": "遥测",
  "summary": "遥测分页列表（session_id/uav_id 过滤）",
  "operationId": "telemetryList",
  "req": {
   "session_id": "SESS-eafcd076d1ce"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alt": 85,
      "created_at": "2026-10-13 17:31:10.747",
      "heading": 45,
      "lat": 30.52,
      "lon": 114.32,
      "mission_id": "",
      "reported_at": "2026-10-13 17:31:10.747",
      "seq": 1,
      "session_id": "SESS-eafcd076d1ce",
      "source": "MANUAL",
      "speed": 12,
      "telemetry_id": "TLM-2511cd7bf738",
      "uav_id": "UAV-A-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.748",
   "trace_id": "TRACE-20261013-437ba6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-dd5b6c"
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
   "session_id": "SESS-eafcd076d1ce",
   "speed": 12
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 17:31:10.747",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 17:31:10.747",
     "seq": 1,
     "session_id": "SESS-eafcd076d1ce",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-2511cd7bf738",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.748",
   "trace_id": "TRACE-20261013-713d76"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.TelemetryReportRequest",
   "timestamp": "2026-10-13 17:31:10.825",
   "trace_id": "TRACE-20261013-c15739"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-eafcd076d1ce"
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
   "timestamp": "2026-10-13 17:31:10.754",
   "trace_id": "TRACE-20261013-1e8b77"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-cab632"
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
   "timestamp": "2026-10-13 17:31:10.753",
   "trace_id": "TRACE-20261013-18ee86"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-2e1493"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-eafcd076d1ce"
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
   "timestamp": "2026-10-13 17:31:10.753",
   "trace_id": "TRACE-20261013-f531fb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-69ff5e"
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
   "timestamp": "2026-10-13 17:31:10.751",
   "trace_id": "TRACE-20261013-7b2539"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-53f9c3"
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
      "created_at": "2026-10-13 17:31:10.755",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 17:31:10.755"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.756",
   "trace_id": "TRACE-20261013-c3435a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-c6c472"
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
    "created_at": "2026-10-13 17:31:10.755",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 17:31:10.755"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.756",
   "trace_id": "TRACE-20261013-753210"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-10-13 17:31:10.826",
   "trace_id": "TRACE-20261013-44b0fb"
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
    "created_at": "2026-10-13 17:31:10.755",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 17:31:10.757"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.757",
   "trace_id": "TRACE-20261013-b3e185"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-10-13 17:31:10.827",
   "trace_id": "TRACE-20261013-902c4b"
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
   "timestamp": "2026-10-13 17:31:10.758",
   "trace_id": "TRACE-20261013-fa2b7f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-10-13 17:31:10.827",
   "trace_id": "TRACE-20261013-4a0050"
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
    "audit_hash": "a6dc0429a5b572433518736fc1f8bc935383f5f9aef90ecb476427298ba2da45",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-10-13 17:31:10.759",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-10-13 17:31:10.759",
    "valid_from": "2026-10-13 17:31:10.759",
    "valid_to": "2026-10-14 17:31:10.759"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.759",
   "trace_id": "TRACE-20261013-3bfe78"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-10-13 17:31:10.827",
   "trace_id": "TRACE-20261013-cdef72"
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
     "audit_hash": "a6dc0429a5b572433518736fc1f8bc935383f5f9aef90ecb476427298ba2da45",
     "audit_id": "AUD-f753d485c6e6",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-14e52ad6395408a9470b378f0a064a15",
     "created_at": "2026-10-13 17:31:10.760",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "a6dc0429a5b572433518736fc1f8bc935383f5f9aef90ecb476427298ba2da45",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-10-13 17:31:10.759",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-10-13 17:31:10.760",
     "valid_from": "2026-10-13 17:31:10.759",
     "valid_to": "2026-10-14 17:31:10.759"
    },
    "chain_tx_id": "CHAINMAKER-14e52ad6395408a9470b378f0a064a15"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.760",
   "trace_id": "TRACE-20261013-cf703f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-10-13 17:31:10.827",
   "trace_id": "TRACE-20261013-0c9b8a"
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
    "chain_tx_id": "CHAINMAKER-6efa9b9602a17b2d8b8ddfff883cc312",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 17:31:10.683",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIDr5voyFgm/Xj6+Au+dw7Rfhw42YSnHFKjQczTJ/bwXqA0IABG29ODaLaxnT1brQ3kE7vr7OyBwlgSqs9FUwQOiSWtH1h678hg5GFgv70lu4xY+s4XFfWf4E5FE3NwSDnclsGA8=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 17:31:10.710",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-4ccd752fa287",
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
     "audit_hash": "6e954a1aac4e0ba90133faa3796ab138ac2e03dc797b987c629820eb196eebe5",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.764",
   "trace_id": "TRACE-20261013-ad32a0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-10-13 17:31:10.827",
   "trace_id": "TRACE-20261013-2bfe94"
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
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-4ccd752fa287,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",6e954a1aac4e0ba90133faa3796ab138ac2e03dc797b987c629820eb196eebe5,CHAINMAKER-6efa9b9602a17b2d8b8ddfff883cc312,2026-10-13 17:31:10.764\nAUD-f753d485c6e6,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",a6dc0429a5b572433518736fc1f8bc935383f5f9aef90ecb476427298ba2da45,CHAINMAKER-14e52ad6395408a9470b378f0a064a15,2026-10-13 17:31:10.760\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.765",
   "trace_id": "TRACE-20261013-b084b9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-70278f"
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
      "audit_hash": "6e954a1aac4e0ba90133faa3796ab138ac2e03dc797b987c629820eb196eebe5",
      "audit_id": "AUD-4ccd752fa287",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-6efa9b9602a17b2d8b8ddfff883cc312",
      "created_at": "2026-10-13 17:31:10.764",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.765",
   "trace_id": "TRACE-20261013-c42129"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-c4e9a2"
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
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n77,TRACE-20261013-ad32a0,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-6efa9b9602a17b2d8b8ddfff883cc312\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-10-13 17:31:10.764\n76,TRACE-20261013-cf703f,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-14e52ad6395408a9470b378f0a064a15\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-10-13 17:31:10.760\n75,TRACE-20261013-3bfe78,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-10-13 17:31:10.759\"\",\"\"valid_to\"\":\"\"2026-10-14 17:31:10.759\"\"}\",2026-10-13 17:31:10.759\n74,TRACE-20261013-fa2b7f,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":0,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 17:31:10.758\n73,TRACE-20261013-b3e185,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-10-13 17:31:10.757\n72,TRACE-20261013-753210,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-10-13 17:31:10.755\n71,TRACE-20261013-0477a3,OP-1,SESSION_CLOSE,SESSION,SESS-eafcd076d1ce,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-10-13 17:31:10.754\n70,TRACE-20261013-0477a3,OP-1,STATE_TRANSITION,SESSION,SESS-eafcd076d1ce,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-10-13 17:31:10.754\n69,TRACE-20261013-7b2539,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-10-13 17:31:10.751\n68,TRACE-20261013-713d76,UAV-A-001,TELEMETRY_REPORT,TELEMETRY,TLM-2511cd7bf738,\"{\"\"position\"\":[30.52,114.32,85],\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-eafcd076d1ce\"\",\"\"source\"\":\"\"MANUAL\"\"}\",2026-10-13 17:31:10.748\n67,TRACE-20261013-4f125f,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-2118bb6c1bbba3bc,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-eafcd076d1ce\"\"}\",2026-10-13 17:31:10.746\n66,TRACE-20261013-4cd348,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-eafcd076d1ce,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 17:31:10.743\n65,TRACE-20261013-4cd348,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-eafcd076d1ce,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-10-13 17:31:10.742\n64,TRACE-20261013-4cd348,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-eafcd076d1ce,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-10-13 17:31:10.742\n63,TRACE-20261013-0ebe8f,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-10-13 17:31:10.739\n62,TRACE-20261013-3894bc,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-b14b2debe539,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":5,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-8d94abfb9d64ab77de44afa13a801196\"\",\"\"reg_record_id\"\":\"\"REGREC-1dbe928a1b3c\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-5d77a5c879786671c8ee4c282700a114\"\",\"\"source_chain_tx_id\"\":\"\"IRITA-fa3f785c18c1489d7c4f61d9e9141f40\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-f940482d4b81d054b0e01f459d0f6664\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-10-13 17:31:10.737\n61,TRACE-20261013-3894bc,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-b14b2debe539,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20261013-3894bc\"\"}\",2026-10-13 17:31:10.737\n60,TRACE-20261013-3894bc,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-b14b2debe539,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-3894bc\"\"}\",2026-10-13 17:31:10.736\n59,TRACE-20261013-3894bc,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-b14b2debe539,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-3894bc\"\"}\",2026-10-13 17:31:10.736\n58,TRACE-20261013-3894bc,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-b14b2debe539,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-3894bc\"\"}\",2026-10-13 17:31:10.735\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.770",
   "trace_id": "TRACE-20261013-71fbf7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-cdc123"
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
      "created_at": "2026-10-13 17:31:10.764",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-6efa9b9602a17b2d8b8ddfff883cc312\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 77,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20261013-ad32a0"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-10-13 17:31:10.760",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-14e52ad6395408a9470b378f0a064a15\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 76,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-cf703f"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-10-13 17:31:10.759",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-10-13 17:31:10.759\",\"valid_to\":\"2026-10-14 17:31:10.759\"}",
      "id": 75,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-3bfe78"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-10-13 17:31:10.758",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":0,\"uav_id\":\"UAV-A-001\"}",
      "id": 74,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20261013-fa2b7f"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-10-13 17:31:10.757",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 73,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-b3e185"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-10-13 17:31:10.755",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 72,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-753210"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-10-13 17:31:10.754",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 71,
      "target_id": "SESS-eafcd076d1ce",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-0477a3"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-10-13 17:31:10.754",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 70,
      "target_id": "SESS-eafcd076d1ce",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-0477a3"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-10-13 17:31:10.751",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 69,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-7b2539"
     },
     {
      "action": "TELEMETRY_REPORT",
      "actor": "UAV-A-001",
      "created_at": "2026-10-13 17:31:10.748",
      "detail": "{\"position\":[30.52,114.32,85],\"seq\":1,\"session_id\":\"SESS-eafcd076d1ce\",\"source\":\"MANUAL\"}",
      "id": 68,
      "target_id": "TLM-2511cd7bf738",
      "target_type": "TELEMETRY",
      "trace_id": "TRACE-20261013-713d76"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 17:31:10.746",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-eafcd076d1ce\"}",
      "id": 67,
      "target_id": "MSG-2118bb6c1bbba3bc",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20261013-4f125f"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 17:31:10.743",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 66,
      "target_id": "SESS-eafcd076d1ce",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-4cd348"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 17:31:10.742",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 65,
      "target_id": "SESS-eafcd076d1ce",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-4cd348"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 17:31:10.742",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 64,
      "target_id": "SESS-eafcd076d1ce",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-4cd348"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-10-13 17:31:10.739",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 63,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-0ebe8f"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 17:31:10.737",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":5,\"reg_receive_tx_id\":\"CHAINMAKER-8d94abfb9d64ab77de44afa13a801196\",\"reg_record_id\":\"REGREC-1dbe928a1b3c\",\"reg_relay_tx_id\":\"CHAINMAKER-5d77a5c879786671c8ee4c282700a114\",\"source_chain_tx_id\":\"IRITA-fa3f785c18c1489d7c4f61d9e9141f40\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-f940482d4b81d054b0e01f459d0f6664\",\"verify_result\":\"PASS\"}",
      "id": 62,
      "target_id": "CX-b14b2debe539",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-3894bc"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 17:31:10.737",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20261013-3894bc\"}",
      "id": 61,
      "target_id": "CX-b14b2debe539",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-3894bc"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 17:31:10.736",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20261013-3894bc\"}",
      "id": 60,
      "target_id": "CX-b14b2debe539",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-3894bc"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 17:31:10.736",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20261013-3894bc\"}",
      "id": 59,
      "target_id": "CX-b14b2debe539",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-3894bc"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 17:31:10.735",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20261013-3894bc\"}",
      "id": 58,
      "target_id": "CX-b14b2debe539",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-3894bc"
     }
    ],
    "total": 77
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.766",
   "trace_id": "TRACE-20261013-6dc896"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-d4d042"
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
      "created_at": "2026-10-13 17:31:10.777",
      "cross_tx_id": "CX-1b28efa5713c",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 5,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-ba0260d307b9a8ddb3d65efafadfe3a8",
      "reg_record_id": "REGREC-2d794033c78d",
      "reg_relay_tx_id": "CHAINMAKER-45f81d9586527c21bae553e437b5d4c6",
      "retry_of": "",
      "signature": "MGYEIHzySrS/yekTK+rmWfgK+7mmtWEUi9yNaoTbA617fhwUA0IABHX1wneIVrYXZqun1ndhEbn0+Xh3TKHeOzq0zwaM5i6QdnWEhMhlZq/Dazw8Zsr//NEgFNV+mRARhs/Rz6M61Hg=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-6611e641354888db6b9f4b507bcc7555",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-10-13 17:31:10.782",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 17:31:10.731",
      "cross_tx_id": "CX-b14b2debe539",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 5,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-8d94abfb9d64ab77de44afa13a801196",
      "reg_record_id": "REGREC-1dbe928a1b3c",
      "reg_relay_tx_id": "CHAINMAKER-5d77a5c879786671c8ee4c282700a114",
      "retry_of": "",
      "signature": "MGYEIHGh5pAwIUWAOYIpG9v+lgJurJZWEIDEgDptlz8bb8JaA0IABIsfWDserRVBwZwidr6SwYioFHD2qsvOPftXUbCUMgZ4Uant/9AROWJVI0Fs69KghlGoPP4jGUc9413cA/hKXoM=",
      "sm3_hash": "1b20b87b6b376e073977da0ae417f5a783ba43cfa9496997e209e0f611e55d2e",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-fa3f785c18c1489d7c4f61d9e9141f40",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-f940482d4b81d054b0e01f459d0f6664",
      "updated_at": "2026-10-13 17:31:10.737",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 17:31:10.716",
      "cross_tx_id": "CX-835f1d9d57e4",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 5,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-7ee1bdd9cc9e38c82611097e8023ce83",
      "reg_record_id": "REGREC-58c2275f2d51",
      "reg_relay_tx_id": "CHAINMAKER-8e77445bf74ac0ccddbbf7c7ba7f2a34",
      "retry_of": "",
      "signature": "MGYEIGf33i877c1hXB9bOIbtg+N39y4yqZ8us1SdyEhNQu8cA0IABEJJxgOb4IqcMMmtgKuoWCbQHkqxRqitSf7lm681o7dzRc3M97jm8udeesgwKYw1EWBURXaQ3tiLGAKXMXMVhac=",
      "sm3_hash": "037cbd3884445d390a5556cdb4cd861da63876944e8cde74b2258e10a720af1e",
      "sm9_identity": "SM9-ID-REGISTRY-ADMIN",
      "source_chain": "irita",
      "source_chain_tx_id": "IRITA-f151732fed76ccb240c01cdc29d5bf67",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-5f4adf3593984ccf39998f0d454718e9",
      "updated_at": "2026-10-13 17:31:10.722",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-79a8293b244b",
      "created_at": "2026-10-13 17:31:10.704",
      "cross_tx_id": "CX-365b0f9cbb46",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "4c18431234fd3b549a48a00972e2d086385e226a0cbe773ac737ffddb32d391a",
      "latency_ms": 6,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-637935e37811c9dfd2b8f08d401dd33e",
      "reg_record_id": "REGREC-a9f8c7f9b5b2",
      "reg_relay_tx_id": "CHAINMAKER-1ac31be4a00a1ff93144fa39d171df14",
      "retry_of": "",
      "signature": "MGYEIB4QGZe39GvN39chWCDoOTS1xYRfBBUeYXx3p27mOc4pA0IABEu/ouTTJgTcGuYD/E0UI0KPT0iRH3n6UHIinJGbK7rld1YYrswKQApnpNRLEO2hgvDx5fgPmBq9Okd1EOye7Pc=",
      "sm3_hash": "676cfca5c5f3819807e4e2efdfd8af63228ffe3b6e316aa246104e913e4ad7d5",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-b0d7e35c40608252e5b96e73bd92f66a",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-d621d79fd8b6ed79b85b31b34c0b3416",
      "updated_at": "2026-10-13 17:31:10.710",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20261013-f5dbfb",
      "created_at": "2026-10-13 17:31:10.692",
      "cross_tx_id": "CX-e3816917ae70",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "5cfb62d602579799bbed070c4d28444af72267b9b5e3b688da5b54ae2903c963",
      "latency_ms": 8,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-b31ae544533bccc4739af754c77413e7",
      "reg_record_id": "REGREC-e2d7e397900d",
      "reg_relay_tx_id": "CHAINMAKER-517f13d3edd899463b75689c80b5953f",
      "retry_of": "",
      "signature": "MGYEIFZk86dFE7JO3xirUCWptm5n7Sh8wV7VQkUNuAlXoRqxA0IABFQlhp/XgEmEeSw1Om4R0fSc9/pNk+vmqVifvzHgq2wCa/fUF/mxS+Vqjn/QQv3wTvpmCcFaBsRLooUXGUxchW8=",
      "sm3_hash": "8102ade235547f5822b5b78011163d17116f7c43a3d1b4c463f626123b687ded",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-750ae16aee3ef5fa27c009844d9f5d09",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-76036ce5c759d819f66531dbd7f76aad",
      "updated_at": "2026-10-13 17:31:10.701",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-10-13 17:31:10.666",
      "cross_tx_id": "CX-c8fb06612c4f",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 5,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-f756e85548f744cb9119d7d8d7335375",
      "reg_record_id": "REGREC-eeacd31ad102",
      "reg_relay_tx_id": "CHAINMAKER-0ac13462590307a98f9b2a29ef1afed5",
      "retry_of": "",
      "signature": "MGYEIIZrOPhSTuG9WwWpuxRp8MYxI09C2QIoi5ma4cqFW1M3A0IABDrubyhnTDsuWb+5fHNfZOZ7CgCE/XxeUZY0kuOUuWPXorTgdWEwemV4mHosjXQyr0grLFCYE2QX/KV5ooObl10=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-103320ae0cf271b309546f6364912742",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-10-13 17:31:10.671",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.784",
   "trace_id": "TRACE-20261013-e8513d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.829",
   "trace_id": "TRACE-20261013-890851"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-1b28efa5713c"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-13 17:31:10.777",
    "cross_tx_id": "CX-1b28efa5713c",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 5,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-ba0260d307b9a8ddb3d65efafadfe3a8",
    "reg_record_id": "REGREC-2d794033c78d",
    "reg_relay_tx_id": "CHAINMAKER-45f81d9586527c21bae553e437b5d4c6",
    "retry_of": "",
    "signature": "MGYEIHzySrS/yekTK+rmWfgK+7mmtWEUi9yNaoTbA617fhwUA0IABHX1wneIVrYXZqun1ndhEbn0+Xh3TKHeOzq0zwaM5i6QdnWEhMhlZq/Dazw8Zsr//NEgFNV+mRARhs/Rz6M61Hg=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-6611e641354888db6b9f4b507bcc7555",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 17:31:10.782",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.783",
   "trace_id": "TRACE-20261013-e53b32"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-0a92a5"
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
    "created_at": "2026-10-13 17:31:10.777",
    "cross_tx_id": "CX-1b28efa5713c",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 5,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-ba0260d307b9a8ddb3d65efafadfe3a8",
    "reg_record_id": "REGREC-2d794033c78d",
    "reg_relay_tx_id": "CHAINMAKER-45f81d9586527c21bae553e437b5d4c6",
    "retry_of": "",
    "signature": "MGYEIHzySrS/yekTK+rmWfgK+7mmtWEUi9yNaoTbA617fhwUA0IABHX1wneIVrYXZqun1ndhEbn0+Xh3TKHeOzq0zwaM5i6QdnWEhMhlZq/Dazw8Zsr//NEgFNV+mRARhs/Rz6M61Hg=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-6611e641354888db6b9f4b507bcc7555",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 17:31:10.782",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.782",
   "trace_id": "TRACE-20261013-c351a1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-10-13 17:31:10.828",
   "trace_id": "TRACE-20261013-f1aea6"
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
    "generated_at": "2026-10-13 17:31:10.784",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-13 17:31:10.755",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 17:31:10.757"
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
   "timestamp": "2026-10-13 17:31:10.786",
   "trace_id": "TRACE-20261013-5bcf8d"
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
    "generated_at": "2026-10-13 17:31:10.829",
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
   "timestamp": "2026-10-13 17:31:10.830",
   "trace_id": "TRACE-20261013-549e11"
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
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20261013-fa8088,RUN-1f90b7f635f0,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-10-13 17:31:10.788,2026-10-13 17:31:10.789\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.797",
   "trace_id": "TRACE-20261013-be7852"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.831",
   "trace_id": "TRACE-20261013-62eb13"
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
      "completed_at": "2026-10-13 17:31:10.789",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20261013-fa8088",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-1f90b7f635f0",
      "scenario": "",
      "started_at": "2026-10-13 17:31:10.788",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.795",
   "trace_id": "TRACE-20261013-74ad28"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 17:31:10.831",
   "trace_id": "TRACE-20261013-45e005"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-1f90b7f635f0"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-13 17:31:10.789",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-fa8088",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-1f90b7f635f0",
    "scenario": "",
    "started_at": "2026-10-13 17:31:10.788",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.790",
   "trace_id": "TRACE-20261013-6955bb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-10-13 17:31:10.831",
   "trace_id": "TRACE-20261013-fe7a37"
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
    "completed_at": "2026-10-13 17:31:10.789",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-fa8088",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-1f90b7f635f0",
    "scenario": "",
    "started_at": "2026-10-13 17:31:10.788",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.789",
   "trace_id": "TRACE-20261013-e3bd96"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-10-13 17:31:10.830",
   "trace_id": "TRACE-20261013-1f750d"
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
     "time": "2026-10-13 17:31:10.666",
     "tx_count": 1,
     "tx_ids": [
      "FABRIC-103320ae0cf271b309546f6364912742"
     ]
    },
    "chain": "fabric"
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.798",
   "trace_id": "TRACE-20261013-ef8015"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerBlockReq",
   "timestamp": "2026-10-13 17:31:10.832",
   "trace_id": "TRACE-20261013-4fc9ea"
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
      "time": "2026-10-13 17:31:10.782",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-b591f89f5795bd96a32f90421bd4c123"
      ]
     },
     {
      "hash": "a7966f6b5719112aceff9d74bd99707c1470def61d6c34b947cfe16605015ac5",
      "height": 8,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-13 17:31:10.777",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-6611e641354888db6b9f4b507bcc7555"
      ]
     },
     {
      "hash": "6fe17ed4b063cbf0ead9cbbec2365b166f56e9e48c470453afcf3f09bbd57bd7",
      "height": 7,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-13 17:31:10.736",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-f940482d4b81d054b0e01f459d0f6664"
      ]
     },
     {
      "hash": "35403d36940a2a89f920a81e1100f2ada820e5350057e80738132a6b4fa58e3a",
      "height": 6,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-13 17:31:10.721",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-5f4adf3593984ccf39998f0d454718e9"
      ]
     },
     {
      "hash": "830c249f4b32bdd592ced45e0a7d4ee85504730b71e935c1f22810759217a0a8",
      "height": 5,
      "proposer": "fabric-sim-node0",
      "time": "2026-10-13 17:31:10.709",
      "tx_count": 1,
      "tx_ids": [
       "FABRIC-d621d79fd8b6ed79b85b31b34c0b3416"
      ]
     }
    ],
    "chain": "fabric",
    "height": 9
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.798",
   "trace_id": "TRACE-20261013-43062f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerBlocksReq",
   "timestamp": "2026-10-13 17:31:10.832",
   "trace_id": "TRACE-20261013-d3ca35"
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
   "timestamp": "2026-10-13 17:31:10.798",
   "trace_id": "TRACE-20261013-7e2868"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerNodesReq",
   "timestamp": "2026-10-13 17:31:10.831",
   "trace_id": "TRACE-20261013-e119fa"
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
   "timestamp": "2026-10-13 17:31:10.797",
   "trace_id": "TRACE-20261013-4cd937"
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
   "timestamp": "2026-10-13 17:31:10.831",
   "trace_id": "TRACE-20261013-768f9e"
  }
 },
 {
  "path": "/api/explorer/tx",
  "tag": "explorer",
  "summary": "按 TxID 链上直查（走既有 QueryTx，不依赖 BlockQuerier；查无→6002）",
  "operationId": "explorerTx",
  "req": {
   "chain": "fabric",
   "tx_id": "FABRIC-b591f89f5795bd96a32f90421bd4c123"
  },
  "resp": {
   "code": 0,
   "data": {
    "chain": "fabric",
    "tx": {
     "block_num": 9,
     "status": 0,
     "timestamp": "2026-10-13 17:31:10.782",
     "tx_id": "FABRIC-b591f89f5795bd96a32f90421bd4c123"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 17:31:10.799",
   "trace_id": "TRACE-20261013-5f59dc"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.explorerTxReq",
   "timestamp": "2026-10-13 17:31:10.832",
   "trace_id": "TRACE-20261013-b193f1"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "UOM登记", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "遥测", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验", "explorer"];
