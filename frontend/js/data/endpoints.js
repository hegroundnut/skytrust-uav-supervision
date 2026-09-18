// 由 docs/apifox/skytrust-backend.openapi.json 生成（64 端点全量，含录制样例）。
// 请勿手改：重新生成命令见 scripts/gen-endpoints.sh。
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
   "timestamp": "2026-09-14 12:10:16.824",
   "trace_id": "TRACE-20260914-180d32"
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
   "timestamp": "2026-09-14 12:10:17.118",
   "trace_id": "TRACE-20260914-7ccc5b"
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
   "timestamp": "2026-09-14 12:10:16.820",
   "trace_id": "TRACE-20260914-d5e87b"
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
   "timestamp": "2026-09-14 12:10:17.117",
   "trace_id": "TRACE-20260914-f6e43f"
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
   "timestamp": "2026-09-14 12:10:16.819",
   "trace_id": "TRACE-20260914-e2274b"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.117",
   "trace_id": "TRACE-20260914-0dcf10"
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
   "timestamp": "2026-09-14 12:10:16.825",
   "trace_id": "TRACE-20260914-72d801"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-09-14 12:10:17.120",
   "trace_id": "TRACE-20260914-4e14ce"
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
   "timestamp": "2026-09-14 12:10:16.827",
   "trace_id": "TRACE-20260914-248e88"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-09-14 12:10:17.122",
   "trace_id": "TRACE-20260914-2a3949"
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
    "signature": "MGYEIF22SUpCSHBPprJZPqWCA1VoDzoCW2JKDm1Nwo3ecdj/A0IABCk1oxsolin3qzBPPMR0ziVyixuXiMpPYduq2I/ctk3CamwtvVSdfr5ku1fWNThgML+si5bFQ4+ZlA6HNkXE7nY=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.829",
   "trace_id": "TRACE-20260914-5c71fe"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-09-14 12:10:17.124",
   "trace_id": "TRACE-20260914-24e596"
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
   "timestamp": "2026-09-14 12:10:16.830",
   "trace_id": "TRACE-20260914-1269f5"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-09-14 12:10:17.125",
   "trace_id": "TRACE-20260914-c30789"
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
   "timestamp": "2026-09-14 12:10:16.834",
   "trace_id": "TRACE-20260914-0255b5"
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
   "timestamp": "2026-09-14 12:10:17.144",
   "trace_id": "TRACE-20260914-eb2c7b"
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
    "reset_at": "2026-09-14 12:10:17.117",
    "started_at": "2026-09-14 12:10:17.115",
    "tables_cleared": 20
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.117",
   "trace_id": "TRACE-20260914-3ca74c"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-09-14 12:10:17.189",
    "started_at": "2026-09-14 12:10:17.187",
    "tables_cleared": 20
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.189",
   "trace_id": "TRACE-20260914-47bfdc"
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
      "created_at": "2026-09-14 12:10:16.755",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.755"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-09-14 12:10:16.756",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.756"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-09-14 12:10:16.756",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.756"
     },
     {
      "adapter_type": "",
      "created_at": "2026-09-14 12:10:16.836",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.836"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.839",
   "trace_id": "TRACE-20260914-c3a2cf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.146",
   "trace_id": "TRACE-20260914-afccae"
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
    "created_at": "2026-09-14 12:10:16.836",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-09-14 12:10:16.836"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.837",
   "trace_id": "TRACE-20260914-235362"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-09-14 12:10:17.146",
   "trace_id": "TRACE-20260914-3cd640"
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
      "created_at": "2026-09-14 12:10:16.756",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.756"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-09-14 12:10:16.757",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.757"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-09-14 12:10:16.758",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.758"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-09-14 12:10:16.841",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-09-14 12:10:16.841"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.843",
   "trace_id": "TRACE-20260914-bd8718"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.148",
   "trace_id": "TRACE-20260914-eb5b87"
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
    "created_at": "2026-09-14 12:10:16.841",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-09-14 12:10:16.841"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.842",
   "trace_id": "TRACE-20260914-2502e1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-09-14 12:10:17.147",
   "trace_id": "TRACE-20260914-8f2bd1"
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
    "created_at": "2026-09-14 12:10:16.844",
    "end_point": "E9",
    "route_id": "R901",
    "start_point": "S9",
    "zone": "Zone-D"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.845",
   "trace_id": "TRACE-20260914-d68605"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-09-14 12:10:17.149",
   "trace_id": "TRACE-20260914-29cc4d"
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
      "created_at": "2026-09-14 12:10:16.777",
      "end_point": "A-EXIT(30.540,114.340)",
      "route_id": "R101",
      "start_point": "A-ENTRY(30.510,114.310)",
      "zone": "Zone-A"
     },
     {
      "altitude_max": 120,
      "altitude_min": 80,
      "corridor_status": "OPEN",
      "created_at": "2026-09-14 12:10:16.777",
      "end_point": "B-GATE(30.572,114.372)",
      "route_id": "R205",
      "start_point": "A-EXIT(30.540,114.340)",
      "zone": "Zone-A"
     },
     {
      "altitude_max": 100,
      "altitude_min": 60,
      "corridor_status": "OPEN",
      "created_at": "2026-09-14 12:10:16.777",
      "end_point": "B-EAST(30.590,114.390)",
      "route_id": "R208",
      "start_point": "B-WEST(30.570,114.370)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 150,
      "altitude_min": 90,
      "corridor_status": "OPEN",
      "created_at": "2026-09-14 12:10:16.778",
      "end_point": "B-NORTH(30.600,114.410)",
      "route_id": "R209",
      "start_point": "B-GATE(30.555,114.365)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 120,
      "altitude_min": 60,
      "corridor_status": "OPEN",
      "created_at": "2026-09-14 12:10:16.778",
      "end_point": "B-LAND(30.620,114.420)",
      "route_id": "R306",
      "start_point": "B-EAST(30.585,114.385)",
      "zone": "Zone-B"
     },
     {
      "altitude_max": 150,
      "altitude_min": 50,
      "corridor_status": "OPEN",
      "created_at": "2026-09-14 12:10:16.844",
      "end_point": "E9",
      "route_id": "R901",
      "start_point": "S9",
      "zone": "Zone-D"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.847",
   "trace_id": "TRACE-20260914-a0c6dd"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.149",
   "trace_id": "TRACE-20260914-551869"
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
      "created_at": "2026-09-14 12:10:16.758",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-09-14 12:10:16.758"
     },
     {
      "created_at": "2026-09-14 12:10:16.758",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-09-14 12:10:16.758"
     },
     {
      "created_at": "2026-09-14 12:10:16.759",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-09-14 12:10:16.759"
     },
     {
      "created_at": "2026-09-14 12:10:16.759",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-09-14 12:10:16.759"
     },
     {
      "created_at": "2026-09-14 12:10:16.759",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-09-14 12:10:16.759"
     },
     {
      "created_at": "2026-09-14 12:10:16.760",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-09-14 12:10:16.760"
     },
     {
      "created_at": "2026-09-14 12:10:16.760",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-09-14 12:10:16.760"
     },
     {
      "created_at": "2026-09-14 12:10:16.849",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-09-14 12:10:16.867"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.872",
   "trace_id": "TRACE-20260914-b4ea14"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.151",
   "trace_id": "TRACE-20260914-799b19"
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
    "created_at": "2026-09-14 12:10:16.849",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-09-14 12:10:16.867"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.870",
   "trace_id": "TRACE-20260914-2dcbc2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-09-14 12:10:17.151",
   "trace_id": "TRACE-20260914-8a0708"
  }
 },
 {
  "path": "/api/uav/register",
  "tag": "无人机",
  "summary": "无人机注册 + UAV_REGISTER_PROOF 跨链三链留痕",
  "operationId": "uavRegister",
  "req": {
   "manufacturer_id": "Manufacturer-B",
   "model": "DJI-M350",
   "operator_id": "Operator-A",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-09-14 12:10:16.854",
     "cross_tx_id": "CX-7f5206f8a6ef",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 11,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-09d6cf623aeb80c6307db70012ccac94",
     "reg_record_id": "REGREC-e7e692780e3a",
     "reg_relay_tx_id": "CHAINMAKER-03c3565eaf25629a9bd6f793827d5673",
     "retry_of": "",
     "signature": "MGYEIHxuEIsi2L4WunDSyWZojnGUJFnY7YjtISg1PgDfOqZ7A0IABK3HtKLj+jNUvxGS/+wronVSmikiHTsvw2XnZaanr9W1OpRqLdL4jOPB0eF1HYzq+MIueL+Fc/Zv9VXu5Hz+xdU=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-2cf1ba556898a8be8f64470ae7cb2a8a",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-09-14 12:10:16.866",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-09-14 12:10:16.849",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-09-14 12:10:16.867"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.868",
   "trace_id": "TRACE-20260914-ec38c7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-09-14 12:10:17.150",
   "trace_id": "TRACE-20260914-f9915c"
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
    "created_at": "2026-09-14 12:10:16.849",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-09-14 12:10:16.876"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.877",
   "trace_id": "TRACE-20260914-07945b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-09-14 12:10:17.153",
   "trace_id": "TRACE-20260914-610756"
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
     "created_at": "2026-09-14 12:10:16.849",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-09-14 12:10:16.874"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.874",
   "trace_id": "TRACE-20260914-ac47c2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-09-14 12:10:17.153",
   "trace_id": "TRACE-20260914-e6b37a"
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
    "created_at": "2026-09-14 12:10:16.896",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIIFJ/DQ33/Eotxe1vDPpuk0uIzAQ9Qd7MvH6/SkD6kqaA0IABKnfGxcLmMj3FmpU1ZSwYdSPtyYVI1NiLs/UhuZuhlyPJByMfjM2CnBRZjigf7fi+yesERlOQ0w6/2qzv1seilg=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-09-14 12:10:16.896",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.897",
   "trace_id": "TRACE-20260914-0ca27e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-09-14 12:10:17.154",
   "trace_id": "TRACE-20260914-b09119"
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
      "created_at": "2026-09-14 12:10:16.896",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIIFJ/DQ33/Eotxe1vDPpuk0uIzAQ9Qd7MvH6/SkD6kqaA0IABKnfGxcLmMj3FmpU1ZSwYdSPtyYVI1NiLs/UhuZuhlyPJByMfjM2CnBRZjigf7fi+yesERlOQ0w6/2qzv1seilg=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-09-14 12:10:16.896",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.903",
   "trace_id": "TRACE-20260914-cfe325"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.155",
   "trace_id": "TRACE-20260914-0d9abb"
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
    "created_at": "2026-09-14 12:10:16.896",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIIFJ/DQ33/Eotxe1vDPpuk0uIzAQ9Qd7MvH6/SkD6kqaA0IABKnfGxcLmMj3FmpU1ZSwYdSPtyYVI1NiLs/UhuZuhlyPJByMfjM2CnBRZjigf7fi+yesERlOQ0w6/2qzv1seilg=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-09-14 12:10:16.896",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.899",
   "trace_id": "TRACE-20260914-4e8e5d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-09-14 12:10:17.155",
   "trace_id": "TRACE-20260914-0a3074"
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
     "application_id": "APP-20260914-9f401f",
     "created_at": "2026-09-14 12:10:16.908",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEILAskL1Rg57BVF6NNXJuHmjWMKlA7If7HzyA8uNNkEBIA0IABASTkfTQ1tdNhQiTgZwtAR8HFGl6tUeghIcPuIsS5s5QejOupEEfmJ9chvORJjMDsbU9Qf9TmlATcJqoDl/Xqqk=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-4f3297c2666127eedf5b300675e88be2",
     "status": "RELAYED",
     "updated_at": "2026-09-14 12:10:16.924"
    },
    "crosschain": {
     "business_id": "APP-20260914-9f401f",
     "created_at": "2026-09-14 12:10:16.911",
     "cross_tx_id": "CX-0f6dc4a106e5",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "b5b2810338c174d14c561678b48d04451a2968b6f0269df8140ac903a85c5917",
     "latency_ms": 11,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-1f6c7960b6afd7ff2fa6e62784a1ff9a",
     "reg_record_id": "REGREC-03c9a6899c2b",
     "reg_relay_tx_id": "CHAINMAKER-1d76c3c9f82908ca46e7d28fd2f45650",
     "retry_of": "",
     "signature": "MGYEICoayuPONmvMe/zhMo7ZP7617Q/8agzu/FYHLeX5iNDzA0IABKWiWFHYS5sL9D4/DwIsO4wtvnOKeVzxt3+PmZrj4a1UCxE9nSr1SxkacN2gu4yAmfy6epuLMUFZ1vEywf4LoyI=",
     "sm3_hash": "fa89f6fe0ebb717f026d6ce03b66fc86c9e5f939deb6fd40ad12849549d4aca5",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-4f3297c2666127eedf5b300675e88be2",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-98acc00a190456f19969edd29bbfa2f1",
     "updated_at": "2026-09-14 12:10:16.923",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.924",
   "trace_id": "TRACE-20260914-edae87"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-09-14 12:10:17.155",
   "trace_id": "TRACE-20260914-d77cbe"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20260914-9f401f"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20260914-9f401f",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-551cb165e1be",
      "review_time": "2026-09-14 12:10:16.928",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.946",
   "trace_id": "TRACE-20260914-d500ff"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-09-14 12:10:17.157",
   "trace_id": "TRACE-20260914-5ab332"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20260914-9f401f",
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
     "business_id": "REV-551cb165e1be",
     "created_at": "2026-09-14 12:10:16.931",
     "cross_tx_id": "CX-85cdb6ec91d4",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "91a0fd6798d9502513f3a58bad821d2918d2f684feabaeec1c4fc83e636aeadd",
     "latency_ms": 11,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-83a34c48f7ef345b98cdefc4e2084669",
     "reg_record_id": "REGREC-9af16a096a26",
     "reg_relay_tx_id": "CHAINMAKER-ad0bd9eff42d95e70e5c8bf8de921f7c",
     "retry_of": "",
     "signature": "MGYEIDoNvXnVOrLf9ivpNRRDnoaY7aQQzRDKNgYOZ/tJDr0nA0IABCk069HNHbETk8CbwYvsmTTdhBadxsFO4d8Buj7kyDGxTBq3YROlSnZ9Jz6vFc5IqjNLq8AjHhNpmQcTza+A+38=",
     "sm3_hash": "878147b1a16d890a886bfae873b1aac115f4ed98ec70789db284c1476c93e0cd",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-e32c2195a75ccdf707a7c6d456bfa309",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-3e9765c36086fc34c8064f0a0e616213",
     "updated_at": "2026-09-14 12:10:16.942",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-09-14 12:10:16.896",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIFJ/DQ33/Eotxe1vDPpuk0uIzAQ9Qd7MvH6/SkD6kqaA0IABKnfGxcLmMj3FmpU1ZSwYdSPtyYVI1NiLs/UhuZuhlyPJByMfjM2CnBRZjigf7fi+yesERlOQ0w6/2qzv1seilg=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-09-14 12:10:16.942",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20260914-9f401f",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-551cb165e1be",
     "review_time": "2026-09-14 12:10:16.928",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.944",
   "trace_id": "TRACE-20260914-4b3dc4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-09-14 12:10:17.156",
   "trace_id": "TRACE-20260914-ea7b71"
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
   "timestamp": "2026-09-14 12:10:16.947",
   "trace_id": "TRACE-20260914-759836"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-09-14 12:10:17.158",
   "trace_id": "TRACE-20260914-122fb1"
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
   "timestamp": "2026-09-14 12:10:16.949",
   "trace_id": "TRACE-20260914-ad2c69"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-09-14 12:10:17.159",
   "trace_id": "TRACE-20260914-e669d0"
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
   "valid_from": "2026-09-14 11:10:16.750",
   "valid_to": "2026-09-14 13:10:16.750"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-09-14 12:10:16.957",
     "cross_tx_id": "CX-6d221a3d4636",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 13,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-47d71a82d525448c1b8d816fc4f5a7be",
     "reg_record_id": "REGREC-5f9bdff105db",
     "reg_relay_tx_id": "CHAINMAKER-1fc952ec1d36ce099c1cb9100d18d472",
     "retry_of": "",
     "signature": "MGYEIJdjH1EVXku1d7NrRNHSBrkQwdbwPGJUeievL7wtXZ8UA0IABI0vuEqclJNuiJaA6TTKgY+HoOBqhPGnTaNkV8Lt3QG2ZvZf6JwE6+U3M6cJHdy4pEwgNO5qkSSK8VjPxIvaOQs=",
     "sm3_hash": "f4de7ba437a52526af4db78df26633d6da692186d9ea1ea64567b0283140ce01",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-ebc056bdd2677a245cbd94b47658bd4c",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-7207375deaf7eb13575326c0f84b898e",
     "updated_at": "2026-09-14 12:10:16.970",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-09-14 12:10:16.953",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIJ8BCc0SE+jsW8Z0VFvQCxYfLbvuhUHYi70gvurY+I26A0IABD+7yHbQqiI6f6zMx7Iav1BpY5Z0BoHXaPV18tsYtAxWmSHqyv3PknvWUK5mLBVdEoce+xcxd58YrbqWsVP8LXY=",
     "sm3_hash": "3241266f0022757108b5aa603f2a3665a1910ce3d87edb274c36a724f7c07d39",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-09-14 12:10:16.971",
     "valid_from": "2026-09-14 11:10:16.750",
     "valid_to": "2026-09-14 13:10:16.750"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.972",
   "trace_id": "TRACE-20260914-eebb72"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-09-14 12:10:17.159",
   "trace_id": "TRACE-20260914-9a7625"
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
      "created_at": "2026-09-14 12:10:16.953",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIJ8BCc0SE+jsW8Z0VFvQCxYfLbvuhUHYi70gvurY+I26A0IABD+7yHbQqiI6f6zMx7Iav1BpY5Z0BoHXaPV18tsYtAxWmSHqyv3PknvWUK5mLBVdEoce+xcxd58YrbqWsVP8LXY=",
      "sm3_hash": "3241266f0022757108b5aa603f2a3665a1910ce3d87edb274c36a724f7c07d39",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-09-14 12:10:16.971",
      "valid_from": "2026-09-14 11:10:16.750",
      "valid_to": "2026-09-14 13:10:16.750"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.976",
   "trace_id": "TRACE-20260914-f79cc3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.160",
   "trace_id": "TRACE-20260914-547006"
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
    "created_at": "2026-09-14 12:10:16.953",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIJ8BCc0SE+jsW8Z0VFvQCxYfLbvuhUHYi70gvurY+I26A0IABD+7yHbQqiI6f6zMx7Iav1BpY5Z0BoHXaPV18tsYtAxWmSHqyv3PknvWUK5mLBVdEoce+xcxd58YrbqWsVP8LXY=",
    "sm3_hash": "3241266f0022757108b5aa603f2a3665a1910ce3d87edb274c36a724f7c07d39",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-09-14 12:10:16.971",
    "valid_from": "2026-09-14 11:10:16.750",
    "valid_to": "2026-09-14 13:10:16.750"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:16.974",
   "trace_id": "TRACE-20260914-b6bd7a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-09-14 12:10:17.159",
   "trace_id": "TRACE-20260914-ca41af"
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
     "created_at": "2026-09-14 12:10:16.988",
     "cross_tx_id": "CX-ccce0861c5ce",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 10,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-acc0a0023b8cedcf193e56e82c90effc",
     "reg_record_id": "REGREC-66fa55c0fba4",
     "reg_relay_tx_id": "CHAINMAKER-e263743e5b202ca7afc9ef3a78b7de99",
     "retry_of": "",
     "signature": "MGYEIKNPwwq9hpMYg1oqqohtXsdcrpsBKfqw8hM9b7l/6ekTA0IABJZlSnKLvMJJdCJu8zGatRweMZ5YzK6mfSst9oSOfgE6BuAU5k60Ga8V3xpzQyi34kPmye9njMXzk/m5bUuUrjE=",
     "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-e470af3afe470c8595178b6ec95863ff",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
     "updated_at": "2026-09-14 12:10:16.999",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-09-14 12:10:16.953",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIJ8BCc0SE+jsW8Z0VFvQCxYfLbvuhUHYi70gvurY+I26A0IABD+7yHbQqiI6f6zMx7Iav1BpY5Z0BoHXaPV18tsYtAxWmSHqyv3PknvWUK5mLBVdEoce+xcxd58YrbqWsVP8LXY=",
     "sm3_hash": "3241266f0022757108b5aa603f2a3665a1910ce3d87edb274c36a724f7c07d39",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-09-14 12:10:16.984",
     "valid_from": "2026-09-14 11:10:16.750",
     "valid_to": "2026-09-14 13:10:16.750"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.000",
   "trace_id": "TRACE-20260914-91acd0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-09-14 12:10:17.161",
   "trace_id": "TRACE-20260914-33d209"
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
   "timestamp": "2026-09-14 12:10:16.982",
   "trace_id": "TRACE-20260914-26efdb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-09-14 12:10:17.161",
   "trace_id": "TRACE-20260914-ee04b4"
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
      "created_at": "2026-09-14 12:10:16.780",
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.004",
      "neighbors": "[]",
      "node_id": "N-DOC-1",
      "node_type": "EDGE",
      "position": "{\"X\":10,\"Y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N-DOC-1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.780",
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.781",
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.781",
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.778",
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
   "timestamp": "2026-09-14 12:10:17.007",
   "trace_id": "TRACE-20260914-7f3862"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.165",
   "trace_id": "TRACE-20260914-3d5b40"
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
    "created_at": "2026-09-14 12:10:17.004",
    "neighbors": "[]",
    "node_id": "N-DOC-1",
    "node_type": "EDGE",
    "position": "{\"X\":10,\"Y\":10}",
    "risk_score": 0,
    "sm9_identity": "SM9-ID-N-DOC-1",
    "status": "ONLINE"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.005",
   "trace_id": "TRACE-20260914-e0977c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-09-14 12:10:17.164",
   "trace_id": "TRACE-20260914-23def0"
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
      "created_at": "2026-09-14 12:10:16.780",
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.779",
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.780",
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.781",
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.781",
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:16.778",
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
   "timestamp": "2026-09-14 12:10:17.002",
   "trace_id": "TRACE-20260914-7b697a"
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
      "created_at": "2026-09-14 12:10:17.142",
      "neighbors": "[\"N4\"]",
      "node_id": "MGR",
      "node_type": "MANAGEMENT",
      "position": "{\"x\":50,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-MGR",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.140",
      "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]",
      "node_id": "N1",
      "node_type": "EDGE",
      "position": "{\"x\":10,\"y\":10}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N1",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.140",
      "neighbors": "[\"N1\",\"N3\"]",
      "node_id": "N2",
      "node_type": "EDGE",
      "position": "{\"x\":20,\"y\":20}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N2",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.141",
      "neighbors": "[\"N2\",\"N4\"]",
      "node_id": "N3",
      "node_type": "EDGE",
      "position": "{\"x\":30,\"y\":30}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N3",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.141",
      "neighbors": "[\"N3\",\"MGR\"]",
      "node_id": "N4",
      "node_type": "EDGE",
      "position": "{\"x\":40,\"y\":40}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-N4",
      "status": "ONLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.142",
      "neighbors": "[]",
      "node_id": "NODE-X",
      "node_type": "ATTACKER",
      "position": "{\"x\":1,\"y\":50}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-X",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.142",
      "neighbors": "[]",
      "node_id": "NODE-Y",
      "node_type": "ATTACKER",
      "position": "{\"x\":99,\"y\":51}",
      "risk_score": 0,
      "sm9_identity": "SM9-ID-NODE-Y",
      "status": "OFFLINE"
     },
     {
      "created_at": "2026-09-14 12:10:17.139",
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
   "timestamp": "2026-09-14 12:10:17.163",
   "trace_id": "TRACE-20260914-cca2e0"
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
   "session_id": "SESS-9fd55f162550"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-09-14 12:10:17.012",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-9fd55f162550",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-09-14 12:10:17.040"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.041",
   "trace_id": "TRACE-20260914-055488"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-09-14 12:10:17.170",
   "trace_id": "TRACE-20260914-8c7220"
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
      "created_at": "2026-09-14 12:10:17.012",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-9fd55f162550",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-09-14 12:10:17.012"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.016",
   "trace_id": "TRACE-20260914-8115ac"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.167",
   "trace_id": "TRACE-20260914-fd9c43"
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
     "nonce": "NONCE-bd2a9639a0b1c7e04f726f24e0a6676e",
     "signature": "MGYEIIyrzX8UHQnhZg2vXdZSy6+nYOpcgmUExp7txKh0E89CA0IABBh31knkOr9wWCJxrx4+3ZZH3ngdXo/vjdPboWYtmV+NT8/5D3I2ifyPFKWZEBEbdXF/TC3mRQwcfllt9Gtg5ds=",
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
     "created_at": "2026-09-14 12:10:17.012",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-9fd55f162550",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-09-14 12:10:17.012"
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.014",
   "trace_id": "TRACE-20260914-adff3c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-09-14 12:10:17.166",
   "trace_id": "TRACE-20260914-bdfc1a"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-9fd55f162550"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-09-14 12:10:17.021",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIJqk7eYQ5+bXNF4CkxmdRhWjUcUbUIopD0pgwOCtEVVPA0IABBOKGzxz/GNbOUezdjWoW94HxJ9bHLg7DnN34JgBSQ6EHHEqpAFC+nU3LD+sGOyWVZ85Q64nItxzCBb3WS9lzJM=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-1062d986ad1e4d96",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-9fd55f162550",
      "sm3_hash": "aa6bf71938120b1aff919e4e6bab0715b88761bb7446c3040c784f2dec0d873d",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-09-14 12:10:17.018"
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
   "timestamp": "2026-09-14 12:10:17.028",
   "trace_id": "TRACE-20260914-726dbf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.168",
   "trace_id": "TRACE-20260914-1d2f7c"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-9fd55f162550",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-09-14 12:10:17.021",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIJqk7eYQ5+bXNF4CkxmdRhWjUcUbUIopD0pgwOCtEVVPA0IABBOKGzxz/GNbOUezdjWoW94HxJ9bHLg7DnN34JgBSQ6EHHEqpAFC+nU3LD+sGOyWVZ85Q64nItxzCBb3WS9lzJM=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-1062d986ad1e4d96",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-9fd55f162550",
     "sm3_hash": "aa6bf71938120b1aff919e4e6bab0715b88761bb7446c3040c784f2dec0d873d",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-09-14 12:10:17.018"
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
   "timestamp": "2026-09-14 12:10:17.022",
   "trace_id": "TRACE-20260914-04f677"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-09-14 12:10:17.167",
   "trace_id": "TRACE-20260914-4bc633"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-9fd55f162550"
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
   "timestamp": "2026-09-14 12:10:17.039",
   "trace_id": "TRACE-20260914-59a446"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.170",
   "trace_id": "TRACE-20260914-34fd76"
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
   "timestamp": "2026-09-14 12:10:17.037",
   "trace_id": "TRACE-20260914-b1f7c2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-09-14 12:10:17.170",
   "trace_id": "TRACE-20260914-ebaac1"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-9fd55f162550"
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
   "timestamp": "2026-09-14 12:10:17.036",
   "trace_id": "TRACE-20260914-f7f3a2"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-09-14 12:10:17.169",
   "trace_id": "TRACE-20260914-27f30b"
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
   "timestamp": "2026-09-14 12:10:17.032",
   "trace_id": "TRACE-20260914-b3ee0c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-09-14 12:10:17.169",
   "trace_id": "TRACE-20260914-838a24"
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
      "created_at": "2026-09-14 12:10:17.043",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-09-14 12:10:17.043"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.046",
   "trace_id": "TRACE-20260914-42d761"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.172",
   "trace_id": "TRACE-20260914-19c7e2"
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
    "created_at": "2026-09-14 12:10:17.043",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-09-14 12:10:17.043"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.044",
   "trace_id": "TRACE-20260914-f890d0"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-09-14 12:10:17.172",
   "trace_id": "TRACE-20260914-8da9ed"
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
    "created_at": "2026-09-14 12:10:17.043",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-09-14 12:10:17.047"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.048",
   "trace_id": "TRACE-20260914-075dc3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-09-14 12:10:17.173",
   "trace_id": "TRACE-20260914-b37bd2"
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
      "latency_ms": 1,
      "level": 7,
      "name": "MANUFACTURER_ID",
      "source": "FISCO_BCOS_DETAIL",
      "status": "RESOLVED",
      "value": "Manufacturer-B"
     }
    ],
    "pseudonym": "PSEUDO-UAV-83921",
    "resolved": true,
    "trace_latency_ms": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.051",
   "trace_id": "TRACE-20260914-6be78f"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-09-14 12:10:17.173",
   "trace_id": "TRACE-20260914-c1d3fc"
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
    "audit_hash": "48575300af47daefe153a9bf96c7e23cf0cf3dbb1dec1f07f6f314505600efd2",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-09-14 12:10:17.053",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-09-14 12:10:17.053",
    "valid_from": "2026-09-14 12:10:17.052",
    "valid_to": "2026-09-15 12:10:17.052"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.054",
   "trace_id": "TRACE-20260914-6eec70"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-09-14 12:10:17.174",
   "trace_id": "TRACE-20260914-08cce0"
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
     "audit_hash": "48575300af47daefe153a9bf96c7e23cf0cf3dbb1dec1f07f6f314505600efd2",
     "audit_id": "AUD-db6513768980",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-bcf00e35618473be5281fe88399b6d6d",
     "created_at": "2026-09-14 12:10:17.056",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "48575300af47daefe153a9bf96c7e23cf0cf3dbb1dec1f07f6f314505600efd2",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-09-14 12:10:17.053",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-09-14 12:10:17.055",
     "valid_from": "2026-09-14 12:10:17.052",
     "valid_to": "2026-09-15 12:10:17.052"
    },
    "chain_tx_id": "CHAINMAKER-bcf00e35618473be5281fe88399b6d6d"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.056",
   "trace_id": "TRACE-20260914-72cd8c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-09-14 12:10:17.174",
   "trace_id": "TRACE-20260914-36fe46"
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
    "chain_tx_id": "CHAINMAKER-70282090238d4089b7f63ea57d1e9122",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-09-14 12:10:16.896",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIIFJ/DQ33/Eotxe1vDPpuk0uIzAQ9Qd7MvH6/SkD6kqaA0IABKnfGxcLmMj3FmpU1ZSwYdSPtyYVI1NiLs/UhuZuhlyPJByMfjM2CnBRZjigf7fi+yesERlOQ0w6/2qzv1seilg=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-09-14 12:10:16.942",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-f9a187954809",
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
     "audit_hash": "574098b4a9af86d272a639f5478ad29a37a8f803d08678b4fd386b8761c996cd",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.068",
   "trace_id": "TRACE-20260914-4757b6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-09-14 12:10:17.175",
   "trace_id": "TRACE-20260914-2a1de0"
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
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-f9a187954809,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",574098b4a9af86d272a639f5478ad29a37a8f803d08678b4fd386b8761c996cd,CHAINMAKER-70282090238d4089b7f63ea57d1e9122,2026-09-14 12:10:17.067\nAUD-db6513768980,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",48575300af47daefe153a9bf96c7e23cf0cf3dbb1dec1f07f6f314505600efd2,CHAINMAKER-bcf00e35618473be5281fe88399b6d6d,2026-09-14 12:10:17.056\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.071",
   "trace_id": "TRACE-20260914-560c15"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.177",
   "trace_id": "TRACE-20260914-045847"
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
      "audit_hash": "574098b4a9af86d272a639f5478ad29a37a8f803d08678b4fd386b8761c996cd",
      "audit_id": "AUD-f9a187954809",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-70282090238d4089b7f63ea57d1e9122",
      "created_at": "2026-09-14 12:10:17.067",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.070",
   "trace_id": "TRACE-20260914-594661"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.176",
   "trace_id": "TRACE-20260914-2fcfa4"
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
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n73,TRACE-20260914-4757b6,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-70282090238d4089b7f63ea57d1e9122\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-09-14 12:10:17.067\n72,TRACE-20260914-72cd8c,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-bcf00e35618473be5281fe88399b6d6d\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-09-14 12:10:17.056\n71,TRACE-20260914-6eec70,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-09-14 12:10:17.052\"\",\"\"valid_to\"\":\"\"2026-09-15 12:10:17.052\"\"}\",2026-09-14 12:10:17.053\n70,TRACE-20260914-6be78f,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":1,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-09-14 12:10:17.051\n69,TRACE-20260914-075dc3,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-09-14 12:10:17.048\n68,TRACE-20260914-f890d0,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-09-14 12:10:17.044\n67,TRACE-20260914-055488,OP-1,SESSION_CLOSE,SESSION,SESS-9fd55f162550,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-09-14 12:10:17.041\n66,TRACE-20260914-055488,OP-1,STATE_TRANSITION,SESSION,SESS-9fd55f162550,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-09-14 12:10:17.040\n65,TRACE-20260914-b3ee0c,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-09-14 12:10:17.031\n64,TRACE-20260914-04f677,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-1062d986ad1e4d96,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-9fd55f162550\"\"}\",2026-09-14 12:10:17.021\n63,TRACE-20260914-adff3c,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-9fd55f162550,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-09-14 12:10:17.014\n62,TRACE-20260914-adff3c,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-9fd55f162550,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-09-14 12:10:17.013\n61,TRACE-20260914-adff3c,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-9fd55f162550,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-09-14 12:10:17.012\n60,TRACE-20260914-e0977c,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-09-14 12:10:17.004\n59,TRACE-20260914-91acd0,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":10,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-acc0a0023b8cedcf193e56e82c90effc\"\",\"\"reg_record_id\"\":\"\"REGREC-66fa55c0fba4\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-e263743e5b202ca7afc9ef3a78b7de99\"\",\"\"source_chain_tx_id\"\":\"\"FISCO-BCOS-e470af3afe470c8595178b6ec95863ff\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-09-14 12:10:16.999\n58,TRACE-20260914-91acd0,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20260914-91acd0\"\"}\",2026-09-14 12:10:16.999\n57,TRACE-20260914-91acd0,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20260914-91acd0\"\"}\",2026-09-14 12:10:16.998\n56,TRACE-20260914-91acd0,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20260914-91acd0\"\"}\",2026-09-14 12:10:16.997\n55,TRACE-20260914-91acd0,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20260914-91acd0\"\"}\",2026-09-14 12:10:16.997\n54,TRACE-20260914-91acd0,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-ccce0861c5ce,\"{\"\"from\"\":\"\"REG_RECEIVED\"\",\"\"to\"\":\"\"REG_VERIFIED\"\",\"\"trace_id\"\":\"\"TRACE-20260914-91acd0\"\"}\",2026-09-14 12:10:16.996\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.077",
   "trace_id": "TRACE-20260914-77f9ee"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.178",
   "trace_id": "TRACE-20260914-f12007"
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
      "created_at": "2026-09-14 12:10:17.067",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-70282090238d4089b7f63ea57d1e9122\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 73,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20260914-4757b6"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-09-14 12:10:17.056",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-bcf00e35618473be5281fe88399b6d6d\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 72,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20260914-72cd8c"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-09-14 12:10:17.053",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-09-14 12:10:17.052\",\"valid_to\":\"2026-09-15 12:10:17.052\"}",
      "id": 71,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20260914-6eec70"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-09-14 12:10:17.051",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":1,\"uav_id\":\"UAV-A-001\"}",
      "id": 70,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20260914-6be78f"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-09-14 12:10:17.048",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 69,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20260914-075dc3"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-09-14 12:10:17.044",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 68,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20260914-f890d0"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-09-14 12:10:17.041",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 67,
      "target_id": "SESS-9fd55f162550",
      "target_type": "SESSION",
      "trace_id": "TRACE-20260914-055488"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-09-14 12:10:17.040",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 66,
      "target_id": "SESS-9fd55f162550",
      "target_type": "SESSION",
      "trace_id": "TRACE-20260914-055488"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-09-14 12:10:17.031",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 65,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20260914-b3ee0c"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-09-14 12:10:17.021",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-9fd55f162550\"}",
      "id": 64,
      "target_id": "MSG-1062d986ad1e4d96",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20260914-04f677"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-09-14 12:10:17.014",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 63,
      "target_id": "SESS-9fd55f162550",
      "target_type": "SESSION",
      "trace_id": "TRACE-20260914-adff3c"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-09-14 12:10:17.013",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 62,
      "target_id": "SESS-9fd55f162550",
      "target_type": "SESSION",
      "trace_id": "TRACE-20260914-adff3c"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-09-14 12:10:17.012",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 61,
      "target_id": "SESS-9fd55f162550",
      "target_type": "SESSION",
      "trace_id": "TRACE-20260914-adff3c"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-09-14 12:10:17.004",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 60,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20260914-e0977c"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.999",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":10,\"reg_receive_tx_id\":\"CHAINMAKER-acc0a0023b8cedcf193e56e82c90effc\",\"reg_record_id\":\"REGREC-66fa55c0fba4\",\"reg_relay_tx_id\":\"CHAINMAKER-e263743e5b202ca7afc9ef3a78b7de99\",\"source_chain_tx_id\":\"FISCO-BCOS-e470af3afe470c8595178b6ec95863ff\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\",\"verify_result\":\"PASS\"}",
      "id": 59,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.999",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20260914-91acd0\"}",
      "id": 58,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.998",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20260914-91acd0\"}",
      "id": 57,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.997",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20260914-91acd0\"}",
      "id": 56,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.997",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20260914-91acd0\"}",
      "id": 55,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-09-14 12:10:16.996",
      "detail": "{\"from\":\"REG_RECEIVED\",\"to\":\"REG_VERIFIED\",\"trace_id\":\"TRACE-20260914-91acd0\"}",
      "id": 54,
      "target_id": "CX-ccce0861c5ce",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20260914-91acd0"
     }
    ],
    "total": 73
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.073",
   "trace_id": "TRACE-20260914-197418"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.177",
   "trace_id": "TRACE-20260914-011874"
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
      "created_at": "2026-09-14 12:10:17.082",
      "cross_tx_id": "CX-1b928a5fb4e2",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 10,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-f3d0ada3c56848212f14cb98908db50d",
      "reg_record_id": "REGREC-5a8aea31b87c",
      "reg_relay_tx_id": "CHAINMAKER-a8536abbc9c805e4df37583d8ca1b764",
      "retry_of": "",
      "signature": "MGYEIFrT9zBXypTCgYDbIpRgRhuA541VJF6Elf4zzMc4Gr4oA0IABIT7bFNHPOcMEDuU+bcmS0PbQoPL7aaME7o0TlsM4Hm9FEOoae7qtRvZSE5uuUVT4r9ImaH+YBn+sbyUKtcLHr4=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-0c84ab446295bd7e994d6f111f61bcae",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-09-14 12:10:17.092",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-09-14 12:10:16.988",
      "cross_tx_id": "CX-ccce0861c5ce",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 10,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-acc0a0023b8cedcf193e56e82c90effc",
      "reg_record_id": "REGREC-66fa55c0fba4",
      "reg_relay_tx_id": "CHAINMAKER-e263743e5b202ca7afc9ef3a78b7de99",
      "retry_of": "",
      "signature": "MGYEIKNPwwq9hpMYg1oqqohtXsdcrpsBKfqw8hM9b7l/6ekTA0IABJZlSnKLvMJJdCJu8zGatRweMZ5YzK6mfSst9oSOfgE6BuAU5k60Ga8V3xpzQyi34kPmye9njMXzk/m5bUuUrjE=",
      "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-e470af3afe470c8595178b6ec95863ff",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
      "updated_at": "2026-09-14 12:10:16.999",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-09-14 12:10:16.957",
      "cross_tx_id": "CX-6d221a3d4636",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 13,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-47d71a82d525448c1b8d816fc4f5a7be",
      "reg_record_id": "REGREC-5f9bdff105db",
      "reg_relay_tx_id": "CHAINMAKER-1fc952ec1d36ce099c1cb9100d18d472",
      "retry_of": "",
      "signature": "MGYEIJdjH1EVXku1d7NrRNHSBrkQwdbwPGJUeievL7wtXZ8UA0IABI0vuEqclJNuiJaA6TTKgY+HoOBqhPGnTaNkV8Lt3QG2ZvZf6JwE6+U3M6cJHdy4pEwgNO5qkSSK8VjPxIvaOQs=",
      "sm3_hash": "f4de7ba437a52526af4db78df26633d6da692186d9ea1ea64567b0283140ce01",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-ebc056bdd2677a245cbd94b47658bd4c",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-7207375deaf7eb13575326c0f84b898e",
      "updated_at": "2026-09-14 12:10:16.970",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-551cb165e1be",
      "created_at": "2026-09-14 12:10:16.931",
      "cross_tx_id": "CX-85cdb6ec91d4",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "91a0fd6798d9502513f3a58bad821d2918d2f684feabaeec1c4fc83e636aeadd",
      "latency_ms": 11,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-83a34c48f7ef345b98cdefc4e2084669",
      "reg_record_id": "REGREC-9af16a096a26",
      "reg_relay_tx_id": "CHAINMAKER-ad0bd9eff42d95e70e5c8bf8de921f7c",
      "retry_of": "",
      "signature": "MGYEIDoNvXnVOrLf9ivpNRRDnoaY7aQQzRDKNgYOZ/tJDr0nA0IABCk069HNHbETk8CbwYvsmTTdhBadxsFO4d8Buj7kyDGxTBq3YROlSnZ9Jz6vFc5IqjNLq8AjHhNpmQcTza+A+38=",
      "sm3_hash": "878147b1a16d890a886bfae873b1aac115f4ed98ec70789db284c1476c93e0cd",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-e32c2195a75ccdf707a7c6d456bfa309",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-3e9765c36086fc34c8064f0a0e616213",
      "updated_at": "2026-09-14 12:10:16.942",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20260914-9f401f",
      "created_at": "2026-09-14 12:10:16.911",
      "cross_tx_id": "CX-0f6dc4a106e5",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "b5b2810338c174d14c561678b48d04451a2968b6f0269df8140ac903a85c5917",
      "latency_ms": 11,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-1f6c7960b6afd7ff2fa6e62784a1ff9a",
      "reg_record_id": "REGREC-03c9a6899c2b",
      "reg_relay_tx_id": "CHAINMAKER-1d76c3c9f82908ca46e7d28fd2f45650",
      "retry_of": "",
      "signature": "MGYEICoayuPONmvMe/zhMo7ZP7617Q/8agzu/FYHLeX5iNDzA0IABKWiWFHYS5sL9D4/DwIsO4wtvnOKeVzxt3+PmZrj4a1UCxE9nSr1SxkacN2gu4yAmfy6epuLMUFZ1vEywf4LoyI=",
      "sm3_hash": "fa89f6fe0ebb717f026d6ce03b66fc86c9e5f939deb6fd40ad12849549d4aca5",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-4f3297c2666127eedf5b300675e88be2",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-98acc00a190456f19969edd29bbfa2f1",
      "updated_at": "2026-09-14 12:10:16.923",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-09-14 12:10:16.854",
      "cross_tx_id": "CX-7f5206f8a6ef",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 11,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-09d6cf623aeb80c6307db70012ccac94",
      "reg_record_id": "REGREC-e7e692780e3a",
      "reg_relay_tx_id": "CHAINMAKER-03c3565eaf25629a9bd6f793827d5673",
      "retry_of": "",
      "signature": "MGYEIHxuEIsi2L4WunDSyWZojnGUJFnY7YjtISg1PgDfOqZ7A0IABK3HtKLj+jNUvxGS/+wronVSmikiHTsvw2XnZaanr9W1OpRqLdL4jOPB0eF1HYzq+MIueL+Fc/Zv9VXu5Hz+xdU=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-2cf1ba556898a8be8f64470ae7cb2a8a",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-09-14 12:10:16.866",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.096",
   "trace_id": "TRACE-20260914-34b804"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.180",
   "trace_id": "TRACE-20260914-284fb4"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-1b928a5fb4e2"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-09-14 12:10:17.082",
    "cross_tx_id": "CX-1b928a5fb4e2",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 10,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-f3d0ada3c56848212f14cb98908db50d",
    "reg_record_id": "REGREC-5a8aea31b87c",
    "reg_relay_tx_id": "CHAINMAKER-a8536abbc9c805e4df37583d8ca1b764",
    "retry_of": "",
    "signature": "MGYEIFrT9zBXypTCgYDbIpRgRhuA541VJF6Elf4zzMc4Gr4oA0IABIT7bFNHPOcMEDuU+bcmS0PbQoPL7aaME7o0TlsM4Hm9FEOoae7qtRvZSE5uuUVT4r9ImaH+YBn+sbyUKtcLHr4=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-0c84ab446295bd7e994d6f111f61bcae",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-09-14 12:10:17.092",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.094",
   "trace_id": "TRACE-20260914-dca33e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-09-14 12:10:17.179",
   "trace_id": "TRACE-20260914-2dadd0"
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
    "created_at": "2026-09-14 12:10:17.082",
    "cross_tx_id": "CX-1b928a5fb4e2",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 10,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-f3d0ada3c56848212f14cb98908db50d",
    "reg_record_id": "REGREC-5a8aea31b87c",
    "reg_relay_tx_id": "CHAINMAKER-a8536abbc9c805e4df37583d8ca1b764",
    "retry_of": "",
    "signature": "MGYEIFrT9zBXypTCgYDbIpRgRhuA541VJF6Elf4zzMc4Gr4oA0IABIT7bFNHPOcMEDuU+bcmS0PbQoPL7aaME7o0TlsM4Hm9FEOoae7qtRvZSE5uuUVT4r9ImaH+YBn+sbyUKtcLHr4=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-0c84ab446295bd7e994d6f111f61bcae",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-09-14 12:10:17.092",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.092",
   "trace_id": "TRACE-20260914-974c9e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-09-14 12:10:17.179",
   "trace_id": "TRACE-20260914-f225bf"
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
    "generated_at": "2026-09-14 12:10:17.098",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-09-14 12:10:17.043",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-09-14 12:10:17.047"
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
   "timestamp": "2026-09-14 12:10:17.102",
   "trace_id": "TRACE-20260914-9b8ddc"
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
    "generated_at": "2026-09-14 12:10:17.180",
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
   "timestamp": "2026-09-14 12:10:17.184",
   "trace_id": "TRACE-20260914-9b4518"
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
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20260914-2debc0,RUN-c6065611c8dd,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-09-14 12:10:17.108,2026-09-14 12:10:17.109\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.114",
   "trace_id": "TRACE-20260914-3fe5eb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.187",
   "trace_id": "TRACE-20260914-8f52f5"
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
      "completed_at": "2026-09-14 12:10:17.109",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20260914-2debc0",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-c6065611c8dd",
      "scenario": "",
      "started_at": "2026-09-14 12:10:17.108",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.112",
   "trace_id": "TRACE-20260914-4f6f52"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-09-14 12:10:17.186",
   "trace_id": "TRACE-20260914-23ab68"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-c6065611c8dd"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-09-14 12:10:17.109",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20260914-2debc0",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-c6065611c8dd",
    "scenario": "",
    "started_at": "2026-09-14 12:10:17.108",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.111",
   "trace_id": "TRACE-20260914-148697"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-09-14 12:10:17.186",
   "trace_id": "TRACE-20260914-d9d434"
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
    "completed_at": "2026-09-14 12:10:17.109",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20260914-2debc0",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-c6065611c8dd",
    "scenario": "",
    "started_at": "2026-09-14 12:10:17.108",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-09-14 12:10:17.110",
   "trace_id": "TRACE-20260914-8d903c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-09-14 12:10:17.185",
   "trace_id": "TRACE-20260914-b67c63"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验"];
