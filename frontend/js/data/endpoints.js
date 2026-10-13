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
   "timestamp": "2026-10-13 15:17:44.191",
   "trace_id": "TRACE-20261013-d549f1"
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
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-1f3bff"
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
   "timestamp": "2026-10-13 15:17:44.191",
   "trace_id": "TRACE-20261013-4f4442"
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
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-6cf5c2"
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
   "timestamp": "2026-10-13 15:17:44.191",
   "trace_id": "TRACE-20261013-17bc0d"
  },
  "err": {
   "code": 0,
   "data": {
    "ping": "pong"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-6082c3"
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
   "timestamp": "2026-10-13 15:17:44.192",
   "trace_id": "TRACE-20261013-f5f537"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "payload 必填",
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-55fb25"
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
   "timestamp": "2026-10-13 15:17:44.192",
   "trace_id": "TRACE-20261013-8cc607"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "entity_id 必填",
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-1e481e"
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
    "signature": "MGYEIEQSTkhh0lh12kgdIVNScXCCIi8Jgj/JXOzgbSiTjbfTA0IABKZfudYMO5XNKwQz0nHMA/Nlchw9Zvl8DCrU2Mri9kkenWE4bYWKiuAQbGpq54y2u+rATiEaViOoEWx2RaoOaok=",
    "sm3_hash": "26713d6330d0178a63a85d4d7cc6b493ffafc8370893f6fb50cb6f3f51edd298"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.193",
   "trace_id": "TRACE-20261013-03c756"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity 与 payload 必填",
   "timestamp": "2026-10-13 15:17:44.282",
   "trace_id": "TRACE-20261013-76a4a7"
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
   "timestamp": "2026-10-13 15:17:44.193",
   "trace_id": "TRACE-20261013-dc1452"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "sm9_identity/payload/signature 必填",
   "timestamp": "2026-10-13 15:17:44.282",
   "trace_id": "TRACE-20261013-5a8d53"
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
   "timestamp": "2026-10-13 15:17:44.196",
   "trace_id": "TRACE-20261013-39af27"
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
   "timestamp": "2026-10-13 15:17:44.287",
   "trace_id": "TRACE-20261013-2bb60a"
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
    "reset_at": "2026-10-13 15:17:44.281",
    "started_at": "2026-10-13 15:17:44.280",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.281",
   "trace_id": "TRACE-20261013-9f2f82"
  },
  "err": {
   "code": 0,
   "data": {
    "reset_at": "2026-10-13 15:17:44.301",
    "started_at": "2026-10-13 15:17:44.301",
    "tables_cleared": 23
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.301",
   "trace_id": "TRACE-20261013-0bde0f"
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
      "created_at": "2026-10-13 15:17:44.181",
      "manufacturer_id": "Manufacturer-A",
      "name": "演示厂商A",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.181"
     },
     {
      "adapter_type": "XAG-ADAPTER",
      "created_at": "2026-10-13 15:17:44.181",
      "manufacturer_id": "Manufacturer-B",
      "name": "演示厂商B",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.181"
     },
     {
      "adapter_type": "FIMI-ADAPTER",
      "created_at": "2026-10-13 15:17:44.181",
      "manufacturer_id": "Manufacturer-C",
      "name": "演示厂商C",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.181"
     },
     {
      "adapter_type": "",
      "created_at": "2026-10-13 15:17:44.197",
      "manufacturer_id": "Manufacturer-DOC",
      "name": "文档样例制造商",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.197"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.197",
   "trace_id": "TRACE-20261013-8156c6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.288",
   "trace_id": "TRACE-20261013-60db70"
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
    "created_at": "2026-10-13 15:17:44.197",
    "manufacturer_id": "Manufacturer-DOC",
    "name": "文档样例制造商",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 15:17:44.197"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.197",
   "trace_id": "TRACE-20261013-382cb5"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.manufacturerRegisterReq",
   "timestamp": "2026-10-13 15:17:44.288",
   "trace_id": "TRACE-20261013-d48c7c"
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
      "created_at": "2026-10-13 15:17:44.181",
      "name": "演示运营商A",
      "operator_id": "Operator-A",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.181"
     },
     {
      "chain_org_id": "org-operator-b",
      "contact": "ops-b@skytrust.demo",
      "created_at": "2026-10-13 15:17:44.181",
      "name": "演示运营商B",
      "operator_id": "Operator-B",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.181"
     },
     {
      "chain_org_id": "org-operator-c",
      "contact": "ops-c@skytrust.demo",
      "created_at": "2026-10-13 15:17:44.182",
      "name": "演示运营商C",
      "operator_id": "Operator-C",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "chain_org_id": "",
      "contact": "",
      "created_at": "2026-10-13 15:17:44.197",
      "name": "文档样例运营商",
      "operator_id": "Operator-DOC",
      "qualification_status": "QUALIFIED",
      "status": "ACTIVE",
      "updated_at": "2026-10-13 15:17:44.197"
     }
    ],
    "total": 4
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.198",
   "trace_id": "TRACE-20261013-7c8600"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.289",
   "trace_id": "TRACE-20261013-a86283"
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
    "created_at": "2026-10-13 15:17:44.197",
    "name": "文档样例运营商",
    "operator_id": "Operator-DOC",
    "qualification_status": "QUALIFIED",
    "status": "ACTIVE",
    "updated_at": "2026-10-13 15:17:44.197"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.198",
   "trace_id": "TRACE-20261013-caa17e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.operatorRegisterReq",
   "timestamp": "2026-10-13 15:17:44.288",
   "trace_id": "TRACE-20261013-a5c391"
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
    "created_at": "2026-10-13 15:17:44.198",
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
   "timestamp": "2026-10-13 15:17:44.199",
   "trace_id": "TRACE-20261013-9e62ca"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.routeCreateReq",
   "timestamp": "2026-10-13 15:17:44.290",
   "trace_id": "TRACE-20261013-3a91f2"
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
      "created_at": "2026-10-13 15:17:44.187",
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
      "created_at": "2026-10-13 15:17:44.187",
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
      "created_at": "2026-10-13 15:17:44.187",
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
      "created_at": "2026-10-13 15:17:44.187",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.198",
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
   "timestamp": "2026-10-13 15:17:44.199",
   "trace_id": "TRACE-20261013-5537d1"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.290",
   "trace_id": "TRACE-20261013-8c22e4"
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
     "created_at": "2026-10-13 15:17:44.201",
     "expires_at": "2028-10-13 15:17:44.200",
     "id_number": "420100199001010011",
     "issued_at": "2026-10-13 15:17:44.200",
     "license_id": "PIL-af325f3fc5d7",
     "license_no": "UAV-PILOT-2026-4794",
     "name": "文档样例操控员",
     "signature": "MGYEIB2YbOcM4Whj4QPMv1TwWt8YiTbwfRcfpZWQTRJ12PotA0IABDZs7cC/Bu+l7nsemyTJNfn0sqkf5mK69byQA7UIINDaZcq1JQGR5N2M0NQ/3qm3UZwDPR2240QYmtlZJliYakQ=",
     "status": "ISSUED",
     "updated_at": "2026-10-13 15:17:44.201"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.201",
   "trace_id": "TRACE-20261013-7907b3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotApplyReq",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-535576"
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
      "created_at": "2026-10-13 15:17:44.201",
      "expires_at": "2028-10-13 15:17:44.200",
      "id_number": "420100199001010011",
      "issued_at": "2026-10-13 15:17:44.200",
      "license_id": "PIL-af325f3fc5d7",
      "license_no": "UAV-PILOT-2026-4794",
      "name": "文档样例操控员",
      "signature": "MGYEIB2YbOcM4Whj4QPMv1TwWt8YiTbwfRcfpZWQTRJ12PotA0IABDZs7cC/Bu+l7nsemyTJNfn0sqkf5mK69byQA7UIINDaZcq1JQGR5N2M0NQ/3qm3UZwDPR2240QYmtlZJliYakQ=",
      "status": "ISSUED",
      "updated_at": "2026-10-13 15:17:44.201"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.201",
   "trace_id": "TRACE-20261013-830e80"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-f8415f"
  }
 },
 {
  "path": "/api/pilot/query",
  "tag": "UOM登记",
  "summary": "执照查询（不存在→7002）",
  "operationId": "pilotQuery",
  "req": {
   "license_id": "PIL-af325f3fc5d7"
  },
  "resp": {
   "code": 0,
   "data": {
    "category": "多旋翼",
    "created_at": "2026-10-13 15:17:44.201",
    "expires_at": "2028-10-13 15:17:44.200",
    "id_number": "420100199001010011",
    "issued_at": "2026-10-13 15:17:44.200",
    "license_id": "PIL-af325f3fc5d7",
    "license_no": "UAV-PILOT-2026-4794",
    "name": "文档样例操控员",
    "signature": "MGYEIB2YbOcM4Whj4QPMv1TwWt8YiTbwfRcfpZWQTRJ12PotA0IABDZs7cC/Bu+l7nsemyTJNfn0sqkf5mK69byQA7UIINDaZcq1JQGR5N2M0NQ/3qm3UZwDPR2240QYmtlZJliYakQ=",
    "status": "ISSUED",
    "updated_at": "2026-10-13 15:17:44.201"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.202",
   "trace_id": "TRACE-20261013-369266"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.pilotQueryReq",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-bcc2be"
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
      "created_at": "2026-10-13 15:17:44.199",
      "id_number": "91420100DOCAIR01X",
      "name": "文档样例物流企业",
      "status": "REGISTERED",
      "subject_id": "RNS-6c909b6bca40",
      "subject_type": "ENTERPRISE",
      "updated_at": "2026-10-13 15:17:44.199"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.200",
   "trace_id": "TRACE-20261013-9eee57"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-d81a2b"
  }
 },
 {
  "path": "/api/realname/query",
  "tag": "UOM登记",
  "summary": "实名主体查询（不存在→7001）",
  "operationId": "realnameQuery",
  "req": {
   "subject_id": "RNS-6c909b6bca40"
  },
  "resp": {
   "code": 0,
   "data": {
    "contact": "027-88880001",
    "created_at": "2026-10-13 15:17:44.199",
    "id_number": "91420100DOCAIR01X",
    "name": "文档样例物流企业",
    "status": "REGISTERED",
    "subject_id": "RNS-6c909b6bca40",
    "subject_type": "ENTERPRISE",
    "updated_at": "2026-10-13 15:17:44.199"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.200",
   "trace_id": "TRACE-20261013-048c8e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameQueryReq",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-f7e3d5"
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
     "created_at": "2026-10-13 15:17:44.199",
     "id_number": "91420100DOCAIR01X",
     "name": "文档样例物流企业",
     "status": "REGISTERED",
     "subject_id": "RNS-6c909b6bca40",
     "subject_type": "ENTERPRISE",
     "updated_at": "2026-10-13 15:17:44.199"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.199",
   "trace_id": "TRACE-20261013-2e724d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.realnameRegisterReq",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-c14863"
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
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-P40",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260001",
      "serial_no": "SN-A001",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "status": "VERIFIED",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M300",
      "operator_id": "Operator-A",
      "realname_id": "",
      "registration_mark": "UAS-20260002",
      "serial_no": "SN-A002",
      "sm9_identity": "SM9-ID-UAV-A-002",
      "status": "VERIFIED",
      "uav_id": "UAV-A-002",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-A",
      "model": "DJI-M30T",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260003",
      "serial_no": "SN-B001",
      "sm9_identity": "SM9-ID-UAV-B-001",
      "status": "VERIFIED",
      "uav_id": "UAV-B-001",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-B",
      "model": "XAG-V40",
      "operator_id": "Operator-B",
      "realname_id": "",
      "registration_mark": "UAS-20260004",
      "serial_no": "SN-B002",
      "sm9_identity": "SM9-ID-UAV-B-002",
      "status": "VERIFIED",
      "uav_id": "UAV-B-002",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260005",
      "serial_no": "SN-C001",
      "sm9_identity": "SM9-ID-UAV-C-001",
      "status": "VERIFIED",
      "uav_id": "UAV-C-001",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8X",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260006",
      "serial_no": "SN-C002",
      "sm9_identity": "SM9-ID-UAV-C-002",
      "status": "VERIFIED",
      "uav_id": "UAV-C-002",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.182",
      "manufacturer_id": "Manufacturer-C",
      "model": "FIMI-F8Pro",
      "operator_id": "Operator-C",
      "realname_id": "",
      "registration_mark": "UAS-20260007",
      "serial_no": "SN-C003",
      "sm9_identity": "SM9-ID-UAV-C-003",
      "status": "VERIFIED",
      "uav_id": "UAV-C-003",
      "updated_at": "2026-10-13 15:17:44.182"
     },
     {
      "created_at": "2026-10-13 15:17:44.202",
      "manufacturer_id": "Manufacturer-B",
      "model": "DJI-M350",
      "operator_id": "Operator-A",
      "realname_id": "RNS-6c909b6bca40",
      "registration_mark": "UAS-00084267",
      "serial_no": "SN-DOC-001",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "status": "VERIFIED",
      "uav_id": "UAV-DOC-001",
      "updated_at": "2026-10-13 15:17:44.207"
     }
    ],
    "total": 8
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.209",
   "trace_id": "TRACE-20261013-c417e6"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.292",
   "trace_id": "TRACE-20261013-4eac22"
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
    "created_at": "2026-10-13 15:17:44.202",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-6c909b6bca40",
    "registration_mark": "UAS-00084267",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "VERIFIED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 15:17:44.207"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.208",
   "trace_id": "TRACE-20261013-352fea"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavQueryReq",
   "timestamp": "2026-10-13 15:17:44.292",
   "trace_id": "TRACE-20261013-6e980e"
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
   "realname_id": "RNS-6c909b6bca40",
   "serial_no": "SN-DOC-001",
   "uav_id": "UAV-DOC-001"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "UAV-DOC-001",
     "created_at": "2026-10-13 15:17:44.204",
     "cross_tx_id": "CX-ead1cb1594dd",
     "error_code": 0,
     "final_target_chain": "chainmaker",
     "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
     "latency_ms": 3,
     "message_type": "UAV_REGISTER_PROOF",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-afb306b0f993121ca7c4044d5567e688",
     "reg_record_id": "REGREC-f05248e0a158",
     "reg_relay_tx_id": "CHAINMAKER-c62eb0675575046769d96bb2fc8c8ba8",
     "retry_of": "",
     "signature": "MGYEIC/OSGB0swrFjSjQEVBAlSc6mqUp3VWfqamq3ZMxf1D1A0IABHAJ/rwvOAe0UVvHusNNtta9bnnB3Y0tagUYH/+nA5YxPrLJ/IFpwLvbL8UO0jiqEK4bd15MxE9AnSpVw4wjy2w=",
     "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-776de8b441c9f4f91dc2ec33263e9828",
     "status": "SUCCESS",
     "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
     "updated_at": "2026-10-13 15:17:44.207",
     "verify_result": "PASS"
    },
    "uav": {
     "created_at": "2026-10-13 15:17:44.202",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-6c909b6bca40",
     "registration_mark": "UAS-00084267",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "VERIFIED",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 15:17:44.207"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.208",
   "trace_id": "TRACE-20261013-788a26"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRegisterReq",
   "timestamp": "2026-10-13 15:17:44.291",
   "trace_id": "TRACE-20261013-b70ec7"
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
    "created_at": "2026-10-13 15:17:44.202",
    "manufacturer_id": "Manufacturer-B",
    "model": "DJI-M350",
    "operator_id": "Operator-A",
    "realname_id": "RNS-6c909b6bca40",
    "registration_mark": "UAS-00084267",
    "serial_no": "SN-DOC-001",
    "sm9_identity": "SM9-ID-UAV-DOC-001",
    "status": "REVOKED",
    "uav_id": "UAV-DOC-001",
    "updated_at": "2026-10-13 15:17:44.210"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.210",
   "trace_id": "TRACE-20261013-d897c8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavRevokeReq",
   "timestamp": "2026-10-13 15:17:44.292",
   "trace_id": "TRACE-20261013-fe41fc"
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
     "created_at": "2026-10-13 15:17:44.202",
     "manufacturer_id": "Manufacturer-B",
     "model": "DJI-M350",
     "operator_id": "Operator-A",
     "realname_id": "RNS-6c909b6bca40",
     "registration_mark": "UAS-00084267",
     "serial_no": "SN-DOC-001",
     "sm9_identity": "SM9-ID-UAV-DOC-001",
     "status": "ACTIVE",
     "uav_id": "UAV-DOC-001",
     "updated_at": "2026-10-13 15:17:44.209"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.209",
   "trace_id": "TRACE-20261013-ee320b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.uavStatusReq",
   "timestamp": "2026-10-13 15:17:44.292",
   "trace_id": "TRACE-20261013-5b4176"
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
    "created_at": "2026-10-13 15:17:44.216",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIGIl3x+k9DN3ioVTzyfayLrWzsUX6HLCU5wumLkJmRrYA0IABIYz/Tr3H462sQOjLMKULUOljuq424pGXJPec1+T9f8Wsy313HA4BUdKlkb0kbrBh5NrZsmvI70ctj4h+oe3qYY=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 15:17:44.216",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.216",
   "trace_id": "TRACE-20261013-5a2eb8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionCreateReq",
   "timestamp": "2026-10-13 15:17:44.292",
   "trace_id": "TRACE-20261013-894ee5"
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
      "created_at": "2026-10-13 15:17:44.216",
      "end_time": "2026-09-12 11:00:00.000",
      "masked_value": "巡线走廊****",
      "mission_id": "MISSION-2026-001",
      "mission_type": "POWER_INSPECTION",
      "operator_id": "Operator-A",
      "payload_type": "CAMERA",
      "pilot_license_id": "",
      "route_segments": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIGIl3x+k9DN3ioVTzyfayLrWzsUX6HLCU5wumLkJmRrYA0IABIYz/Tr3H462sQOjLMKULUOljuq424pGXJPec1+T9f8Wsy313HA4BUdKlkb0kbrBh5NrZsmvI70ctj4h+oe3qYY=",
      "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "start_time": "2026-09-12 09:00:00.000",
      "status": "DRAFT",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 15:17:44.216",
      "zones": "[\"Zone-A\",\"Zone-B\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.217",
   "trace_id": "TRACE-20261013-7d9a53"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.293",
   "trace_id": "TRACE-20261013-652fae"
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
    "created_at": "2026-10-13 15:17:44.216",
    "end_time": "2026-09-12 11:00:00.000",
    "masked_value": "巡线走廊****",
    "mission_id": "MISSION-2026-001",
    "mission_type": "POWER_INSPECTION",
    "operator_id": "Operator-A",
    "payload_type": "CAMERA",
    "pilot_license_id": "",
    "route_segments": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIGIl3x+k9DN3ioVTzyfayLrWzsUX6HLCU5wumLkJmRrYA0IABIYz/Tr3H462sQOjLMKULUOljuq424pGXJPec1+T9f8Wsy313HA4BUdKlkb0kbrBh5NrZsmvI70ctj4h+oe3qYY=",
    "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "start_time": "2026-09-12 09:00:00.000",
    "status": "DRAFT",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 15:17:44.216",
    "zones": "[\"Zone-A\",\"Zone-B\"]"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.216",
   "trace_id": "TRACE-20261013-77798b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionQueryReq",
   "timestamp": "2026-10-13 15:17:44.293",
   "trace_id": "TRACE-20261013-db7829"
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
     "application_id": "APP-20261013-c2d3ee",
     "created_at": "2026-10-13 15:17:44.218",
     "mission_id": "MISSION-2026-001",
     "signature": "MGYEIIqXBKGzbxefJB7k44kbp5xGoCtyC/1uGPE8IQyLrw3yA0IABGSYHwlFQPD/8kUadKMhmFiZYg9d12ar11WjHUa0VP+CI5DTcSyoZFVVDMOljw8l9fnjaqBlqcUCot9S//ztJD0=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "source_chain": "fabric",
     "source_tx_id": "FABRIC-93f78b2f745a7b2d7b22f2c6fb8122a1",
     "status": "RELAYED",
     "updated_at": "2026-10-13 15:17:44.222"
    },
    "crosschain": {
     "business_id": "APP-20261013-c2d3ee",
     "created_at": "2026-10-13 15:17:44.219",
     "cross_tx_id": "CX-a79e8e0e09b1",
     "error_code": 0,
     "final_target_chain": "fisco-bcos",
     "idempotency_key": "093d071ea9e128df0479c75b487a71dc5a18422c74ab011c79f81637cf1f52b4",
     "latency_ms": 2,
     "message_type": "MISSION_APPLICATION",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-aef0a2398cde5aa8d50cb1114bc13033",
     "reg_record_id": "REGREC-d37f61b605ad",
     "reg_relay_tx_id": "CHAINMAKER-9156d8bc6a5704bf07d81c55dcdb433b",
     "retry_of": "",
     "signature": "MGYEIBt4FrQLqCXdx0UCbgyfh+TLGtnD49BRORNxm1cXXlLrA0IABGxs631V5RP1ExIEHGvaletN7G+co+1zgSX1UQP1EM4wQEqSM9ir9wq7WT8PyQGI4PCfRhBInsw1IYUeU3oUvyw=",
     "sm3_hash": "d29a303817150114ef42cc9540d17d8aeb1b13d083214d3218a39080214b6018",
     "sm9_identity": "SM9-ID-Operator-A",
     "source_chain": "fabric",
     "source_chain_tx_id": "FABRIC-93f78b2f745a7b2d7b22f2c6fb8122a1",
     "status": "SUCCESS",
     "target_chain_tx_id": "FISCO-BCOS-f3cd2101f64b861cf27831769dd7a68a",
     "updated_at": "2026-10-13 15:17:44.221",
     "verify_result": "PASS"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.222",
   "trace_id": "TRACE-20261013-761410"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.missionSubmitReq",
   "timestamp": "2026-10-13 15:17:44.293",
   "trace_id": "TRACE-20261013-adb53f"
  }
 },
 {
  "path": "/api/review/query",
  "tag": "审核",
  "summary": "审核记录查询",
  "operationId": "reviewQuery",
  "req": {
   "application_id": "APP-20261013-c2d3ee"
  },
  "resp": {
   "code": 0,
   "data": {
    "records": [
     {
      "application_id": "APP-20261013-c2d3ee",
      "comment": "同意执行",
      "result": "APPROVED",
      "review_id": "REV-27f738cbf4f9",
      "review_time": "2026-10-13 15:17:44.222",
      "reviewer": "FISCO-ADMIN",
      "rules_hit": "[\"R-ALT-001\"]"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.227",
   "trace_id": "TRACE-20261013-cef460"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewQueryReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-ee98d7"
  }
 },
 {
  "path": "/api/review/submit",
  "tag": "审核",
  "summary": "审核裁决（MISSION_REVIEW_RESULT 回传源链）",
  "operationId": "reviewSubmit",
  "req": {
   "application_id": "APP-20261013-c2d3ee",
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
     "business_id": "REV-27f738cbf4f9",
     "created_at": "2026-10-13 15:17:44.223",
     "cross_tx_id": "CX-0794736b1d17",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "47c4f81bbe9d3c67de6c537439231b7b848b9aa22271567faded48894a13741c",
     "latency_ms": 3,
     "message_type": "MISSION_REVIEW_RESULT",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-10dbc357fb46856a20238baf6479fafa",
     "reg_record_id": "REGREC-4aeea1f37eb1",
     "reg_relay_tx_id": "CHAINMAKER-56db713859990600d6433e811a9640b2",
     "retry_of": "",
     "signature": "MGYEIH2tX3AsQ7gfbc2xN9PjpvDhCrIsX2i++jcczVBR5FIeA0IABDaCnpLLzWRUzWUAsJIjFpYq+Z4NDlF7KPTY1PIGMiAvIQt+r4xT9CGIoLUACAdKOtRpI60QC0fL8eMme/qAzCM=",
     "sm3_hash": "8fe32749d82fcef3bfc00ea9a24560a5ed0c0f6dad41602080cfa307dbb2e09f",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-0dedac6e184e9d49a9d78bdfc39ba0c2",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-c117b7d7022f38e4911faefa570d6c38",
     "updated_at": "2026-10-13 15:17:44.226",
     "verify_result": "PASS"
    },
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 15:17:44.216",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIGIl3x+k9DN3ioVTzyfayLrWzsUX6HLCU5wumLkJmRrYA0IABIYz/Tr3H462sQOjLMKULUOljuq424pGXJPec1+T9f8Wsy313HA4BUdKlkb0kbrBh5NrZsmvI70ctj4h+oe3qYY=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 15:17:44.227",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "review": {
     "application_id": "APP-20261013-c2d3ee",
     "comment": "同意执行",
     "result": "APPROVED",
     "review_id": "REV-27f738cbf4f9",
     "review_time": "2026-10-13 15:17:44.222",
     "reviewer": "FISCO-ADMIN",
     "rules_hit": "[\"R-ALT-001\"]"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.227",
   "trace_id": "TRACE-20261013-27c822"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.reviewSubmitReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-0e4733"
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
   "timestamp": "2026-10-13 15:17:44.228",
   "trace_id": "TRACE-20261013-722029"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictDetectReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-c11042"
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
   "timestamp": "2026-10-13 15:17:44.228",
   "trace_id": "TRACE-20261013-c5ba70"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.conflictResolveReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-be640b"
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
   "valid_from": "2026-10-13 14:17:44.180",
   "valid_to": "2026-10-13 16:17:44.180"
  },
  "resp": {
   "code": 0,
   "data": {
    "crosschain": {
     "business_id": "PASS-2026-001",
     "created_at": "2026-10-13 15:17:44.230",
     "cross_tx_id": "CX-334e4b53897a",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
     "latency_ms": 2,
     "message_type": "FLIGHT_PASS",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-f8c335a1cb006a54fcf0b65a0ba0c11d",
     "reg_record_id": "REGREC-a7041fa64401",
     "reg_relay_tx_id": "CHAINMAKER-280f63ecfa8a2029e2e51ce8629685f9",
     "retry_of": "",
     "signature": "MGYEIAcDmMtqCsxGcyLqFyXeJpNC/pyiqt05XCiIC6MVFHixA0IABDH8fdMxhUOgzvuCKNLvU3ZMwpqkv7lTtuZtn+w4AdBacM16jT9aeKXm/iqUNjhCosuQ0FKKt3Qy4PQBr85mYKQ=",
     "sm3_hash": "5d5ac694a0e647caa8599c05fafe90b7e1b464fb758fea34270ed6981d05e010",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-08c9b6d36ce5413c83db2927cc54dd5f",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-439e5ae98e9c43954867bc917f6e7e87",
     "updated_at": "2026-10-13 15:17:44.233",
     "verify_result": "PASS"
    },
    "pass": {
     "created_at": "2026-10-13 15:17:44.229",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIDARFPpbVcCo5pZ5HldRfoOkPXBJcuUIQ0ovfzKdya5uA0IABCI9JpofLCgc6jvQ8iu3MWXhzCp1voe4HOwCsHWffMe+UtwkgyYHdburAVa5tGaQC23HG853wTpGDnHNOIiOngw=",
     "sm3_hash": "52aa516b586f2e8d08eaf9399c402fabb0a3eaf6757f7625db5ac414fc572fad",
     "status": "VALID",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 15:17:44.233",
     "valid_from": "2026-10-13 14:17:44.180",
     "valid_to": "2026-10-13 16:17:44.180"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.233",
   "trace_id": "TRACE-20261013-048ff9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIssueReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-83e896"
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
      "created_at": "2026-10-13 15:17:44.229",
      "mission_id": "MISSION-2026-001",
      "pass_id": "PASS-2026-001",
      "route": "[\"R101\",\"R205\",\"R306\"]",
      "signature": "MGYEIDARFPpbVcCo5pZ5HldRfoOkPXBJcuUIQ0ovfzKdya5uA0IABCI9JpofLCgc6jvQ8iu3MWXhzCp1voe4HOwCsHWffMe+UtwkgyYHdburAVa5tGaQC23HG853wTpGDnHNOIiOngw=",
      "sm3_hash": "52aa516b586f2e8d08eaf9399c402fabb0a3eaf6757f7625db5ac414fc572fad",
      "status": "VALID",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 15:17:44.233",
      "valid_from": "2026-10-13 14:17:44.180",
      "valid_to": "2026-10-13 16:17:44.180"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.234",
   "trace_id": "TRACE-20261013-573efe"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.295",
   "trace_id": "TRACE-20261013-4cea6f"
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
    "created_at": "2026-10-13 15:17:44.229",
    "mission_id": "MISSION-2026-001",
    "pass_id": "PASS-2026-001",
    "route": "[\"R101\",\"R205\",\"R306\"]",
    "signature": "MGYEIDARFPpbVcCo5pZ5HldRfoOkPXBJcuUIQ0ovfzKdya5uA0IABCI9JpofLCgc6jvQ8iu3MWXhzCp1voe4HOwCsHWffMe+UtwkgyYHdburAVa5tGaQC23HG853wTpGDnHNOIiOngw=",
    "sm3_hash": "52aa516b586f2e8d08eaf9399c402fabb0a3eaf6757f7625db5ac414fc572fad",
    "status": "VALID",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 15:17:44.233",
    "valid_from": "2026-10-13 14:17:44.180",
    "valid_to": "2026-10-13 16:17:44.180"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.234",
   "trace_id": "TRACE-20261013-5e766e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 15:17:44.294",
   "trace_id": "TRACE-20261013-4b6082"
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
     "created_at": "2026-10-13 15:17:44.237",
     "cross_tx_id": "CX-f4dc5f8c5e9e",
     "error_code": 0,
     "final_target_chain": "fabric",
     "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
     "latency_ms": 5,
     "message_type": "PASS_REVOKE",
     "policy_result": "PASS",
     "reg_receive_tx_id": "CHAINMAKER-dce9ee800b5c5b9cf0466c0a68294a29",
     "reg_record_id": "REGREC-eaa7a917ae70",
     "reg_relay_tx_id": "CHAINMAKER-fc651e065b917733ebf71826c014c610",
     "retry_of": "",
     "signature": "MGYEIKr/14XlwjyjNpqi7AEVnwP3CCF/eZIR1Q1oDdKC6/yYA0IABFA6iu5YNzQuUql0/pU6yLM0RwJ/TN+3xX0wABZKGf6AcZSDovpkI/Tx4b0xdUFGZCVHQvi/IseL0LXjhtXlwbg=",
     "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
     "sm9_identity": "SM9-ID-FISCO-ADMIN",
     "source_chain": "fisco-bcos",
     "source_chain_tx_id": "FISCO-BCOS-52e36d043d0e2d9f71b59117e783da28",
     "status": "SUCCESS",
     "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
     "updated_at": "2026-10-13 15:17:44.243",
     "verify_result": "PASS"
    },
    "crosschain_status": "SUCCESS",
    "pass": {
     "created_at": "2026-10-13 15:17:44.229",
     "mission_id": "MISSION-2026-001",
     "pass_id": "PASS-2026-001",
     "route": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIDARFPpbVcCo5pZ5HldRfoOkPXBJcuUIQ0ovfzKdya5uA0IABCI9JpofLCgc6jvQ8iu3MWXhzCp1voe4HOwCsHWffMe+UtwkgyYHdburAVa5tGaQC23HG853wTpGDnHNOIiOngw=",
     "sm3_hash": "52aa516b586f2e8d08eaf9399c402fabb0a3eaf6757f7625db5ac414fc572fad",
     "status": "REVOKED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 15:17:44.236",
     "valid_from": "2026-10-13 14:17:44.180",
     "valid_to": "2026-10-13 16:17:44.180"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.244",
   "trace_id": "TRACE-20261013-2bc7d9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passRevokeReq",
   "timestamp": "2026-10-13 15:17:44.295",
   "trace_id": "TRACE-20261013-4a7438"
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
   "timestamp": "2026-10-13 15:17:44.236",
   "trace_id": "TRACE-20261013-68b960"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.passIDReq",
   "timestamp": "2026-10-13 15:17:44.295",
   "trace_id": "TRACE-20261013-38528d"
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.246",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.188",
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
   "timestamp": "2026-10-13 15:17:44.247",
   "trace_id": "TRACE-20261013-192ee4"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.296",
   "trace_id": "TRACE-20261013-89c3ce"
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
    "created_at": "2026-10-13 15:17:44.246",
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
   "timestamp": "2026-10-13 15:17:44.247",
   "trace_id": "TRACE-20261013-1b0a7e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.NodeRegisterRequest",
   "timestamp": "2026-10-13 15:17:44.296",
   "trace_id": "TRACE-20261013-6bb72d"
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.188",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.189",
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
      "created_at": "2026-10-13 15:17:44.188",
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
   "timestamp": "2026-10-13 15:17:44.245",
   "trace_id": "TRACE-20261013-1cf30d"
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
      "created_at": "2026-10-13 15:17:44.286",
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
      "created_at": "2026-10-13 15:17:44.285",
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
      "created_at": "2026-10-13 15:17:44.285",
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
      "created_at": "2026-10-13 15:17:44.286",
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
      "created_at": "2026-10-13 15:17:44.286",
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
      "created_at": "2026-10-13 15:17:44.286",
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
      "created_at": "2026-10-13 15:17:44.287",
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
      "created_at": "2026-10-13 15:17:44.284",
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
   "timestamp": "2026-10-13 15:17:44.295",
   "trace_id": "TRACE-20261013-f0c979"
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
   "session_id": "SESS-2218c9c52d3d"
  },
  "resp": {
   "code": 0,
   "data": {
    "created_at": "2026-10-13 15:17:44.249",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "mission_id": "",
    "pass_id": "",
    "session_id": "SESS-2218c9c52d3d",
    "status": "CLOSED",
    "uav_id": "UAV-A-001",
    "updated_at": "2026-10-13 15:17:44.259"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.259",
   "trace_id": "TRACE-20261013-aa6567"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionCloseRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-17f8da"
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
      "created_at": "2026-10-13 15:17:44.249",
      "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "mission_id": "",
      "pass_id": "",
      "session_id": "SESS-2218c9c52d3d",
      "status": "ACTIVE",
      "uav_id": "UAV-A-001",
      "updated_at": "2026-10-13 15:17:44.249"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.250",
   "trace_id": "TRACE-20261013-16c052"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.296",
   "trace_id": "TRACE-20261013-d076ab"
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
     "nonce": "NONCE-eb4143a4be89378f89bb3239c5355e41",
     "signature": "MGYEIBbWCRGYqOt5n6NpGKdWNuw8ezdE6iozO3E4W6XJRSl3A0IABLDFZJQ72xXmwxWTDr5KW6uqTOHzG6Tt2ObTropxeLEvmC/043E4ed+dqx48Jo77Kb1KdA++td3T1l+vOvgjrZE=",
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
     "created_at": "2026-10-13 15:17:44.249",
     "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "mission_id": "",
     "pass_id": "",
     "session_id": "SESS-2218c9c52d3d",
     "status": "ACTIVE",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 15:17:44.249"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.249",
   "trace_id": "TRACE-20261013-1295b9"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.SessionOpenRequest",
   "timestamp": "2026-10-13 15:17:44.296",
   "trace_id": "TRACE-20261013-1796de"
  }
 },
 {
  "path": "/api/message/list",
  "tag": "消息",
  "summary": "消息列表（可选过滤 session_id/status）",
  "operationId": "messageList",
  "req": {
   "session_id": "SESS-2218c9c52d3d"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "created_at": "2026-10-13 15:17:44.251",
      "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIBsJTcdWBP7DEyt1qZ4Y/U10sJu6I4kTg7U+fPelza8dA0IABJixgwlnJN6MYGhk5/0WEm7d/J6YBbioH7i+sweFgnmGscSwxiDrBpH+go7xCm1YPTnlwO11YI7IXBKNDYTuemQ=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
      "latency_ms": 45,
      "message_id": "MSG-bab6126e34841000",
      "msg_type": "HEARTBEAT",
      "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
      "seq": 1,
      "session_id": "SESS-2218c9c52d3d",
      "sm3_hash": "290e8e7a10758333c77fce07bec21b204795222d8f7fd2939421f51fed150d84",
      "source_node": "UAV-A-001-NODE",
      "status": "SUCCESS",
      "target_node": "MGR",
      "timestamp": "2026-10-13 15:17:44.251"
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
   "timestamp": "2026-10-13 15:17:44.254",
   "trace_id": "TRACE-20261013-fbb1bb"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-f240f3"
  }
 },
 {
  "path": "/api/message/send",
  "tag": "消息",
  "summary": "链下消息发送（亚秒时延，SUCCESS/FAILED）",
  "operationId": "messageSend",
  "req": {
   "msg_type": "HEARTBEAT",
   "session_id": "SESS-2218c9c52d3d",
   "source_node": "UAV-A-001-NODE",
   "target_node": "MGR"
  },
  "resp": {
   "code": 0,
   "data": {
    "message": {
     "created_at": "2026-10-13 15:17:44.251",
     "evidence": "{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},{\"from\":\"N1\",\"to\":\"N2\",\"latency_ms\":9},{\"from\":\"N2\",\"to\":\"N3\",\"latency_ms\":9},{\"from\":\"N3\",\"to\":\"N4\",\"latency_ms\":9},{\"from\":\"N4\",\"to\":\"MGR\",\"latency_ms\":9}],\"proxy_signed\":true,\"signature\":\"MGYEIBsJTcdWBP7DEyt1qZ4Y/U10sJu6I4kTg7U+fPelza8dA0IABJixgwlnJN6MYGhk5/0WEm7d/J6YBbioH7i+sweFgnmGscSwxiDrBpH+go7xCm1YPTnlwO11YI7IXBKNDYTuemQ=\",\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\"}",
     "latency_ms": 45,
     "message_id": "MSG-bab6126e34841000",
     "msg_type": "HEARTBEAT",
     "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
     "seq": 1,
     "session_id": "SESS-2218c9c52d3d",
     "sm3_hash": "290e8e7a10758333c77fce07bec21b204795222d8f7fd2939421f51fed150d84",
     "source_node": "UAV-A-001-NODE",
     "status": "SUCCESS",
     "target_node": "MGR",
     "timestamp": "2026-10-13 15:17:44.251"
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
   "timestamp": "2026-10-13 15:17:44.251",
   "trace_id": "TRACE-20261013-2e3168"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.MessageSendRequest",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-efd21b"
  }
 },
 {
  "path": "/api/telemetry/latest",
  "tag": "遥测",
  "summary": "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）",
  "operationId": "telemetryLatest",
  "req": {
   "session_id": "SESS-2218c9c52d3d"
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 15:17:44.255",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 15:17:44.255",
     "seq": 1,
     "session_id": "SESS-2218c9c52d3d",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-1d94e1cf0b04",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.256",
   "trace_id": "TRACE-20261013-585022"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-c38d62"
  }
 },
 {
  "path": "/api/telemetry/list",
  "tag": "遥测",
  "summary": "遥测分页列表（session_id/uav_id 过滤）",
  "operationId": "telemetryList",
  "req": {
   "session_id": "SESS-2218c9c52d3d"
  },
  "resp": {
   "code": 0,
   "data": {
    "page": 1,
    "page_size": 20,
    "records": [
     {
      "alt": 85,
      "created_at": "2026-10-13 15:17:44.255",
      "heading": 45,
      "lat": 30.52,
      "lon": 114.32,
      "mission_id": "",
      "reported_at": "2026-10-13 15:17:44.255",
      "seq": 1,
      "session_id": "SESS-2218c9c52d3d",
      "source": "MANUAL",
      "speed": 12,
      "telemetry_id": "TLM-1d94e1cf0b04",
      "uav_id": "UAV-A-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.256",
   "trace_id": "TRACE-20261013-c23554"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-5ba498"
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
   "session_id": "SESS-2218c9c52d3d",
   "speed": 12
  },
  "resp": {
   "code": 0,
   "data": {
    "telemetry": {
     "alt": 85,
     "created_at": "2026-10-13 15:17:44.255",
     "heading": 45,
     "lat": 30.52,
     "lon": 114.32,
     "mission_id": "",
     "reported_at": "2026-10-13 15:17:44.255",
     "seq": 1,
     "session_id": "SESS-2218c9c52d3d",
     "source": "MANUAL",
     "speed": 12,
     "telemetry_id": "TLM-1d94e1cf0b04",
     "uav_id": "UAV-A-001"
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.255",
   "trace_id": "TRACE-20261013-9f3fc8"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.TelemetryReportRequest",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-979d47"
  }
 },
 {
  "path": "/api/event/list",
  "tag": "攻防",
  "summary": "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）",
  "operationId": "eventList",
  "req": {
   "session_id": "SESS-2218c9c52d3d"
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
   "timestamp": "2026-10-13 15:17:44.259",
   "trace_id": "TRACE-20261013-132258"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-57965a"
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
   "timestamp": "2026-10-13 15:17:44.258",
   "trace_id": "TRACE-20261013-00b15a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.PathSwitchRequest",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-0208c2"
  }
 },
 {
  "path": "/api/risk/evaluate",
  "tag": "攻防",
  "summary": "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）",
  "operationId": "riskEvaluate",
  "req": {
   "session_id": "SESS-2218c9c52d3d"
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
   "timestamp": "2026-10-13 15:17:44.258",
   "trace_id": "TRACE-20261013-8d5e45"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.RiskEvaluateRequest",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-7883ec"
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
   "timestamp": "2026-10-13 15:17:44.257",
   "trace_id": "TRACE-20261013-9a3f75"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type offchain.WormholeToggleRequest",
   "timestamp": "2026-10-13 15:17:44.297",
   "trace_id": "TRACE-20261013-e2b04d"
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
      "created_at": "2026-10-13 15:17:44.259",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "OPEN",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 15:17:44.259"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.260",
   "trace_id": "TRACE-20261013-d2cf12"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-1bd51a"
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
    "created_at": "2026-10-13 15:17:44.259",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "OPEN",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 15:17:44.259"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.260",
   "trace_id": "TRACE-20261013-694d67"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertRaiseRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-ed320f"
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
    "created_at": "2026-10-13 15:17:44.259",
    "event_type": "ROUTE_DEVIATION",
    "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
    "mission_id": "MISSION-2026-001",
    "risk_level": "HIGH",
    "source_system": "MANUAL",
    "status": "IDENTIFIED",
    "uav_pseudonym": "PSEUDO-UAV-83921",
    "updated_at": "2026-10-13 15:17:44.261"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.261",
   "trace_id": "TRACE-20261013-ffe889"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AlertStatusRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-62bb8a"
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
   "timestamp": "2026-10-13 15:17:44.261",
   "trace_id": "TRACE-20261013-3eed1d"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.TraceRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-6ba259"
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
    "audit_hash": "e37c923b3527a83b5fd86b2b49768d24a405de7f40703b213e9f58751e8f93c1",
    "authorization_id": "AUTH-2026-001",
    "created_at": "2026-10-13 15:17:44.262",
    "reason": "核查告警 ALERT-2026-001",
    "regulator_id": "REG-01",
    "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
    "status": "PENDING",
    "target_id": "MISSION-2026-001",
    "target_type": "MISSION",
    "updated_at": "2026-10-13 15:17:44.262",
    "valid_from": "2026-10-13 15:17:44.262",
    "valid_to": "2026-10-14 15:17:44.262"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.262",
   "trace_id": "TRACE-20261013-cd63b3"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthApplyRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-0056f1"
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
     "audit_hash": "e37c923b3527a83b5fd86b2b49768d24a405de7f40703b213e9f58751e8f93c1",
     "audit_id": "AUD-219c3575eae0",
     "authorization_id": "AUTH-2026-001",
     "chain_tx_id": "CHAINMAKER-313f541c5a3aef8865296d20676ae483",
     "created_at": "2026-10-13 15:17:44.262",
     "operator_id": "REG-ADMIN",
     "result": "{\"comment\":\"同意\",\"decision\":\"APPROVE\"}",
     "target": "MISSION-2026-001"
    },
    "auth": {
     "audit_hash": "e37c923b3527a83b5fd86b2b49768d24a405de7f40703b213e9f58751e8f93c1",
     "authorization_id": "AUTH-2026-001",
     "created_at": "2026-10-13 15:17:44.262",
     "reason": "核查告警 ALERT-2026-001",
     "regulator_id": "REG-01",
     "scope": "[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
     "status": "AUTHORIZED",
     "target_id": "MISSION-2026-001",
     "target_type": "MISSION",
     "updated_at": "2026-10-13 15:17:44.262",
     "valid_from": "2026-10-13 15:17:44.262",
     "valid_to": "2026-10-14 15:17:44.262"
    },
    "chain_tx_id": "CHAINMAKER-313f541c5a3aef8865296d20676ae483"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.262",
   "trace_id": "TRACE-20261013-5c9a56"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.AuthReviewRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-d0c9d6"
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
    "chain_tx_id": "CHAINMAKER-3014151b5338ea079a8d92ed2a6faa3e",
    "conclusion": {
     "payload_verdict": "PAYLOAD_OK",
     "raised_alerts": [],
     "route_verdict": "ROUTE_OK"
    },
    "decrypted_view": "巡线走廊Zone-A全线巡检",
    "mission": {
     "altitude_max": 120,
     "altitude_min": 60,
     "created_at": "2026-10-13 15:17:44.216",
     "end_time": "2026-09-12 11:00:00.000",
     "masked_value": "巡线走廊****",
     "mission_id": "MISSION-2026-001",
     "mission_type": "POWER_INSPECTION",
     "operator_id": "Operator-A",
     "payload_type": "CAMERA",
     "pilot_license_id": "",
     "route_segments": "[\"R101\",\"R205\",\"R306\"]",
     "signature": "MGYEIGIl3x+k9DN3ioVTzyfayLrWzsUX6HLCU5wumLkJmRrYA0IABIYz/Tr3H462sQOjLMKULUOljuq424pGXJPec1+T9f8Wsy313HA4BUdKlkb0kbrBh5NrZsmvI70ctj4h+oe3qYY=",
     "sm3_hash": "7472ef680f2e572c2c5de6e6496fc01cb9f3f3e0e209ef662508e28c9f675e79",
     "sm9_identity": "SM9-ID-UAV-A-001",
     "start_time": "2026-09-12 09:00:00.000",
     "status": "APPROVED",
     "uav_id": "UAV-A-001",
     "updated_at": "2026-10-13 15:17:44.227",
     "zones": "[\"Zone-A\",\"Zone-B\"]"
    },
    "reg_audit_id": "AUD-522c62ed2a46",
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
     "audit_hash": "d770418e33a46709f9c3877e522948669ee2d6b48f01e2aef7642050aa228442",
     "digest_match": true,
     "signature_valid": true
    }
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.265",
   "trace_id": "TRACE-20261013-869b3a"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type regulatory.InspectRequest",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-52ea45"
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
    "content": "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\nAUD-522c62ed2a46,,AUTH-2026-001,INSPECT,REG-01,MISSION-2026-001,\"{\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",d770418e33a46709f9c3877e522948669ee2d6b48f01e2aef7642050aa228442,CHAINMAKER-3014151b5338ea079a8d92ed2a6faa3e,2026-10-13 15:17:44.265\nAUD-219c3575eae0,,AUTH-2026-001,AUTH_APPROVE,REG-ADMIN,MISSION-2026-001,\"{\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\"}\",e37c923b3527a83b5fd86b2b49768d24a405de7f40703b213e9f58751e8f93c1,CHAINMAKER-313f541c5a3aef8865296d20676ae483,2026-10-13 15:17:44.262\n",
    "format": "csv",
    "rows": 2
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.266",
   "trace_id": "TRACE-20261013-96fe33"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-41ba42"
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
      "audit_hash": "d770418e33a46709f9c3877e522948669ee2d6b48f01e2aef7642050aa228442",
      "audit_id": "AUD-522c62ed2a46",
      "authorization_id": "AUTH-2026-001",
      "chain_tx_id": "CHAINMAKER-3014151b5338ea079a8d92ed2a6faa3e",
      "created_at": "2026-10-13 15:17:44.265",
      "operator_id": "REG-01",
      "result": "{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "target": "MISSION-2026-001"
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.266",
   "trace_id": "TRACE-20261013-c7591c"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-29da39"
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
    "content": "id,trace_id,actor,action,target_type,target_id,detail,created_at\n77,TRACE-20261013-869b3a,REG-01,INSPECT,MISSION,MISSION-2026-001,\"{\"\"authorization_id\"\":\"\"AUTH-2026-001\"\",\"\"chain_tx_id\"\":\"\"CHAINMAKER-3014151b5338ea079a8d92ed2a6faa3e\"\",\"\"digest_match\"\":true,\"\"payload_verdict\"\":\"\"PAYLOAD_OK\"\",\"\"raised_alerts\"\":[],\"\"route_verdict\"\":\"\"ROUTE_OK\"\",\"\"signature_valid\"\":true}\",2026-10-13 15:17:44.265\n76,TRACE-20261013-5c9a56,REG-ADMIN,AUTH_REVIEW,AUTH,AUTH-2026-001,\"{\"\"chain_tx_id\"\":\"\"CHAINMAKER-313f541c5a3aef8865296d20676ae483\"\",\"\"comment\"\":\"\"同意\"\",\"\"decision\"\":\"\"APPROVE\"\",\"\"status\"\":\"\"AUTHORIZED\"\"}\",2026-10-13 15:17:44.262\n75,TRACE-20261013-cd63b3,REG-01,AUTH_APPLY,AUTH,AUTH-2026-001,\"{\"\"reason\"\":\"\"核查告警 ALERT-2026-001\"\",\"\"scope\"\":[\"\"MISSION\"\",\"\"ROUTE\"\",\"\"PAYLOAD\"\",\"\"IDENTITY\"\"],\"\"target_id\"\":\"\"MISSION-2026-001\"\",\"\"target_type\"\":\"\"MISSION\"\",\"\"valid_from\"\":\"\"2026-10-13 15:17:44.262\"\",\"\"valid_to\"\":\"\"2026-10-14 15:17:44.262\"\"}\",2026-10-13 15:17:44.262\n74,TRACE-20261013-3eed1d,REG-01,TRACE_IDENTITY,PSEUDO,PSEUDO-UAV-83921,\"{\"\"entry\"\":\"\"ALERT-2026-001\"\",\"\"entry_type\"\":\"\"ALERT_ID\"\",\"\"manufacturer_id\"\":\"\"Manufacturer-B\"\",\"\"operator_id\"\":\"\"Operator-A\"\",\"\"trace_latency_ms\"\":0,\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 15:17:44.261\n73,TRACE-20261013-ffe889,REG-01,ALERT_STATUS,ALERT,ALERT-2026-001,\"{\"\"from\"\":\"\"OPEN\"\",\"\"reason\"\":\"\"初判成立\"\",\"\"to\"\":\"\"IDENTIFIED\"\"}\",2026-10-13 15:17:44.261\n72,TRACE-20261013-694d67,REG-01,ALERT_RAISE,ALERT,ALERT-2026-001,\"{\"\"event_type\"\":\"\"ROUTE_DEVIATION\"\",\"\"evidence_hash\"\":\"\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\"\",\"\"mission_id\"\":\"\"MISSION-2026-001\"\",\"\"risk_level\"\":\"\"HIGH\"\",\"\"source_system\"\":\"\"MANUAL\"\",\"\"uav_pseudonym\"\":\"\"PSEUDO-UAV-83921\"\",\"\"wormhole_event_id\"\":\"\"\"\"}\",2026-10-13 15:17:44.260\n71,TRACE-20261013-aa6567,OP-1,SESSION_CLOSE,SESSION,SESS-2218c9c52d3d,\"{\"\"reason\"\":\"\"文档演示完毕\"\"}\",2026-10-13 15:17:44.259\n70,TRACE-20261013-aa6567,OP-1,STATE_TRANSITION,SESSION,SESS-2218c9c52d3d,\"{\"\"from\"\":\"\"ACTIVE\"\",\"\"reason\"\":\"\"文档演示完毕\"\",\"\"to\"\":\"\"CLOSED\"\"}\",2026-10-13 15:17:44.259\n69,TRACE-20261013-9a3f75,ATTACKER-SIM,WORMHOLE_ENABLE,NODE,NODE-X+NODE-Y,\"{\"\"fake_adjacency\"\":{\"\"NODE-X\"\":[\"\"N1\"\",\"\"NODE-Y\"\"],\"\"NODE-Y\"\":[\"\"NODE-X\"\",\"\"N4\"\"]}}\",2026-10-13 15:17:44.257\n68,TRACE-20261013-9f3fc8,UAV-A-001,TELEMETRY_REPORT,TELEMETRY,TLM-1d94e1cf0b04,\"{\"\"position\"\":[30.52,114.32,85],\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-2218c9c52d3d\"\",\"\"source\"\":\"\"MANUAL\"\"}\",2026-10-13 15:17:44.255\n67,TRACE-20261013-2e3168,UAV-A-001-NODE,MESSAGE_SEND,MESSAGE,MSG-bab6126e34841000,\"{\"\"latency_ms\"\":45,\"\"msg_type\"\":\"\"HEARTBEAT\"\",\"\"seq\"\":1,\"\"session_id\"\":\"\"SESS-2218c9c52d3d\"\"}\",2026-10-13 15:17:44.251\n66,TRACE-20261013-1295b9,UAV-A-001-NODE,SESSION_OPEN,SESSION,SESS-2218c9c52d3d,\"{\"\"mission_id\"\":\"\"\"\",\"\"pass_id\"\":\"\"\"\",\"\"path\"\":[\"\"UAV-A-001-NODE\"\",\"\"N1\"\",\"\"N2\"\",\"\"N3\"\",\"\"N4\"\",\"\"MGR\"\"],\"\"uav_id\"\":\"\"UAV-A-001\"\"}\",2026-10-13 15:17:44.249\n65,TRACE-20261013-1295b9,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-2218c9c52d3d,\"{\"\"from\"\":\"\"AUTHENTICATED\"\",\"\"to\"\":\"\"ACTIVE\"\"}\",2026-10-13 15:17:44.249\n64,TRACE-20261013-1295b9,UAV-A-001-NODE,STATE_TRANSITION,SESSION,SESS-2218c9c52d3d,\"{\"\"from\"\":\"\"INIT\"\",\"\"to\"\":\"\"AUTHENTICATED\"\"}\",2026-10-13 15:17:44.249\n63,TRACE-20261013-1b0a7e,PLATFORM,NODE_REGISTER,NODE,N-DOC-1,\"{\"\"node_type\"\":\"\"EDGE\"\",\"\"sm9_identity\"\":\"\"SM9-ID-N-DOC-1\"\",\"\"status\"\":\"\"ONLINE\"\"}\",2026-10-13 15:17:44.246\n62,TRACE-20261013-2bc7d9,GATEWAY,CROSSCHAIN_PASS_REVOKE,CROSSCHAIN_TX,CX-f4dc5f8c5e9e,\"{\"\"business_id\"\":\"\"PASS-2026-001\"\",\"\"error_code\"\":0,\"\"fail_reason\"\":\"\"\"\",\"\"latency_ms\"\":5,\"\"reg_receive_tx_id\"\":\"\"CHAINMAKER-dce9ee800b5c5b9cf0466c0a68294a29\"\",\"\"reg_record_id\"\":\"\"REGREC-eaa7a917ae70\"\",\"\"reg_relay_tx_id\"\":\"\"CHAINMAKER-fc651e065b917733ebf71826c014c610\"\",\"\"source_chain_tx_id\"\":\"\"FISCO-BCOS-52e36d043d0e2d9f71b59117e783da28\"\",\"\"status\"\":\"\"SUCCESS\"\",\"\"target_chain_tx_id\"\":\"\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\"\",\"\"verify_result\"\":\"\"PASS\"\"}\",2026-10-13 15:17:44.244\n61,TRACE-20261013-2bc7d9,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-f4dc5f8c5e9e,\"{\"\"from\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"to\"\":\"\"SUCCESS\"\",\"\"trace_id\"\":\"\"TRACE-20261013-2bc7d9\"\"}\",2026-10-13 15:17:44.243\n60,TRACE-20261013-2bc7d9,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-f4dc5f8c5e9e,\"{\"\"from\"\":\"\"TARGET_CONFIRMED\"\",\"\"to\"\":\"\"RETURN_REG_RECEIVED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-2bc7d9\"\"}\",2026-10-13 15:17:44.242\n59,TRACE-20261013-2bc7d9,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-f4dc5f8c5e9e,\"{\"\"from\"\":\"\"REG_RELAYED\"\",\"\"to\"\":\"\"TARGET_CONFIRMED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-2bc7d9\"\"}\",2026-10-13 15:17:44.242\n58,TRACE-20261013-2bc7d9,GATEWAY,STATE_TRANSITION,CROSSCHAIN_TX,CX-f4dc5f8c5e9e,\"{\"\"from\"\":\"\"REG_VERIFIED\"\",\"\"to\"\":\"\"REG_RELAYED\"\",\"\"trace_id\"\":\"\"TRACE-20261013-2bc7d9\"\"}\",2026-10-13 15:17:44.242\n",
    "format": "csv",
    "rows": 20
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.268",
   "trace_id": "TRACE-20261013-657b5b"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.299",
   "trace_id": "TRACE-20261013-82078b"
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
      "created_at": "2026-10-13 15:17:44.265",
      "detail": "{\"authorization_id\":\"AUTH-2026-001\",\"chain_tx_id\":\"CHAINMAKER-3014151b5338ea079a8d92ed2a6faa3e\",\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"raised_alerts\":[],\"route_verdict\":\"ROUTE_OK\",\"signature_valid\":true}",
      "id": 77,
      "target_id": "MISSION-2026-001",
      "target_type": "MISSION",
      "trace_id": "TRACE-20261013-869b3a"
     },
     {
      "action": "AUTH_REVIEW",
      "actor": "REG-ADMIN",
      "created_at": "2026-10-13 15:17:44.262",
      "detail": "{\"chain_tx_id\":\"CHAINMAKER-313f541c5a3aef8865296d20676ae483\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"status\":\"AUTHORIZED\"}",
      "id": 76,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-5c9a56"
     },
     {
      "action": "AUTH_APPLY",
      "actor": "REG-01",
      "created_at": "2026-10-13 15:17:44.262",
      "detail": "{\"reason\":\"核查告警 ALERT-2026-001\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"MISSION-2026-001\",\"target_type\":\"MISSION\",\"valid_from\":\"2026-10-13 15:17:44.262\",\"valid_to\":\"2026-10-14 15:17:44.262\"}",
      "id": 75,
      "target_id": "AUTH-2026-001",
      "target_type": "AUTH",
      "trace_id": "TRACE-20261013-cd63b3"
     },
     {
      "action": "TRACE_IDENTITY",
      "actor": "REG-01",
      "created_at": "2026-10-13 15:17:44.261",
      "detail": "{\"entry\":\"ALERT-2026-001\",\"entry_type\":\"ALERT_ID\",\"manufacturer_id\":\"Manufacturer-B\",\"operator_id\":\"Operator-A\",\"trace_latency_ms\":0,\"uav_id\":\"UAV-A-001\"}",
      "id": 74,
      "target_id": "PSEUDO-UAV-83921",
      "target_type": "PSEUDO",
      "trace_id": "TRACE-20261013-3eed1d"
     },
     {
      "action": "ALERT_STATUS",
      "actor": "REG-01",
      "created_at": "2026-10-13 15:17:44.261",
      "detail": "{\"from\":\"OPEN\",\"reason\":\"初判成立\",\"to\":\"IDENTIFIED\"}",
      "id": 73,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-ffe889"
     },
     {
      "action": "ALERT_RAISE",
      "actor": "REG-01",
      "created_at": "2026-10-13 15:17:44.260",
      "detail": "{\"event_type\":\"ROUTE_DEVIATION\",\"evidence_hash\":\"d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad\",\"mission_id\":\"MISSION-2026-001\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\",\"wormhole_event_id\":\"\"}",
      "id": 72,
      "target_id": "ALERT-2026-001",
      "target_type": "ALERT",
      "trace_id": "TRACE-20261013-694d67"
     },
     {
      "action": "SESSION_CLOSE",
      "actor": "OP-1",
      "created_at": "2026-10-13 15:17:44.259",
      "detail": "{\"reason\":\"文档演示完毕\"}",
      "id": 71,
      "target_id": "SESS-2218c9c52d3d",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-aa6567"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "OP-1",
      "created_at": "2026-10-13 15:17:44.259",
      "detail": "{\"from\":\"ACTIVE\",\"reason\":\"文档演示完毕\",\"to\":\"CLOSED\"}",
      "id": 70,
      "target_id": "SESS-2218c9c52d3d",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-aa6567"
     },
     {
      "action": "WORMHOLE_ENABLE",
      "actor": "ATTACKER-SIM",
      "created_at": "2026-10-13 15:17:44.257",
      "detail": "{\"fake_adjacency\":{\"NODE-X\":[\"N1\",\"NODE-Y\"],\"NODE-Y\":[\"NODE-X\",\"N4\"]}}",
      "id": 69,
      "target_id": "NODE-X+NODE-Y",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-9a3f75"
     },
     {
      "action": "TELEMETRY_REPORT",
      "actor": "UAV-A-001",
      "created_at": "2026-10-13 15:17:44.255",
      "detail": "{\"position\":[30.52,114.32,85],\"seq\":1,\"session_id\":\"SESS-2218c9c52d3d\",\"source\":\"MANUAL\"}",
      "id": 68,
      "target_id": "TLM-1d94e1cf0b04",
      "target_type": "TELEMETRY",
      "trace_id": "TRACE-20261013-9f3fc8"
     },
     {
      "action": "MESSAGE_SEND",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 15:17:44.251",
      "detail": "{\"latency_ms\":45,\"msg_type\":\"HEARTBEAT\",\"seq\":1,\"session_id\":\"SESS-2218c9c52d3d\"}",
      "id": 67,
      "target_id": "MSG-bab6126e34841000",
      "target_type": "MESSAGE",
      "trace_id": "TRACE-20261013-2e3168"
     },
     {
      "action": "SESSION_OPEN",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 15:17:44.249",
      "detail": "{\"mission_id\":\"\",\"pass_id\":\"\",\"path\":[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"],\"uav_id\":\"UAV-A-001\"}",
      "id": 66,
      "target_id": "SESS-2218c9c52d3d",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-1295b9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 15:17:44.249",
      "detail": "{\"from\":\"AUTHENTICATED\",\"to\":\"ACTIVE\"}",
      "id": 65,
      "target_id": "SESS-2218c9c52d3d",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-1295b9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "UAV-A-001-NODE",
      "created_at": "2026-10-13 15:17:44.249",
      "detail": "{\"from\":\"INIT\",\"to\":\"AUTHENTICATED\"}",
      "id": 64,
      "target_id": "SESS-2218c9c52d3d",
      "target_type": "SESSION",
      "trace_id": "TRACE-20261013-1295b9"
     },
     {
      "action": "NODE_REGISTER",
      "actor": "PLATFORM",
      "created_at": "2026-10-13 15:17:44.246",
      "detail": "{\"node_type\":\"EDGE\",\"sm9_identity\":\"SM9-ID-N-DOC-1\",\"status\":\"ONLINE\"}",
      "id": 63,
      "target_id": "N-DOC-1",
      "target_type": "NODE",
      "trace_id": "TRACE-20261013-1b0a7e"
     },
     {
      "action": "CROSSCHAIN_PASS_REVOKE",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 15:17:44.244",
      "detail": "{\"business_id\":\"PASS-2026-001\",\"error_code\":0,\"fail_reason\":\"\",\"latency_ms\":5,\"reg_receive_tx_id\":\"CHAINMAKER-dce9ee800b5c5b9cf0466c0a68294a29\",\"reg_record_id\":\"REGREC-eaa7a917ae70\",\"reg_relay_tx_id\":\"CHAINMAKER-fc651e065b917733ebf71826c014c610\",\"source_chain_tx_id\":\"FISCO-BCOS-52e36d043d0e2d9f71b59117e783da28\",\"status\":\"SUCCESS\",\"target_chain_tx_id\":\"FABRIC-9866b543c0781e937f1fc6b4c55d31c5\",\"verify_result\":\"PASS\"}",
      "id": 62,
      "target_id": "CX-f4dc5f8c5e9e",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-2bc7d9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 15:17:44.243",
      "detail": "{\"from\":\"RETURN_REG_RECEIVED\",\"to\":\"SUCCESS\",\"trace_id\":\"TRACE-20261013-2bc7d9\"}",
      "id": 61,
      "target_id": "CX-f4dc5f8c5e9e",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-2bc7d9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 15:17:44.242",
      "detail": "{\"from\":\"TARGET_CONFIRMED\",\"to\":\"RETURN_REG_RECEIVED\",\"trace_id\":\"TRACE-20261013-2bc7d9\"}",
      "id": 60,
      "target_id": "CX-f4dc5f8c5e9e",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-2bc7d9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 15:17:44.242",
      "detail": "{\"from\":\"REG_RELAYED\",\"to\":\"TARGET_CONFIRMED\",\"trace_id\":\"TRACE-20261013-2bc7d9\"}",
      "id": 59,
      "target_id": "CX-f4dc5f8c5e9e",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-2bc7d9"
     },
     {
      "action": "STATE_TRANSITION",
      "actor": "GATEWAY",
      "created_at": "2026-10-13 15:17:44.242",
      "detail": "{\"from\":\"REG_VERIFIED\",\"to\":\"REG_RELAYED\",\"trace_id\":\"TRACE-20261013-2bc7d9\"}",
      "id": 58,
      "target_id": "CX-f4dc5f8c5e9e",
      "target_type": "CROSSCHAIN_TX",
      "trace_id": "TRACE-20261013-2bc7d9"
     }
    ],
    "total": 77
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.267",
   "trace_id": "TRACE-20261013-c6b377"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.298",
   "trace_id": "TRACE-20261013-0a2938"
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
      "created_at": "2026-10-13 15:17:44.270",
      "cross_tx_id": "CX-9c2600733c8f",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
      "latency_ms": 2,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-04c5365d92da78607c64bbed8504fdcb",
      "reg_record_id": "REGREC-f460d3f0f07a",
      "reg_relay_tx_id": "CHAINMAKER-b014242c841564afe4d50fb86f5d76bb",
      "retry_of": "",
      "signature": "MGYEIDvrLF79zOEhux97DTVW0fe/GiJTINFkGrcYQ5Xnc5qjA0IABABLgcK5pO8wfZTaUuNe+8NVR1rI+47+lkI7ciuxdYPMLvjhhnbZn/aIKDRX7MVKmo4wYqDRHw1jCOhYaOSrvXg=",
      "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
      "sm9_identity": "SM9-ID-UAV-A-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-af63eaf8d263c511b3ff6c4abced3a9f",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
      "updated_at": "2026-10-13 15:17:44.273",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 15:17:44.237",
      "cross_tx_id": "CX-f4dc5f8c5e9e",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "370a264f2a3c8eb216f62dec3bdd0cd36b2ab9b89f667ab461ef50bc9f8e2595",
      "latency_ms": 5,
      "message_type": "PASS_REVOKE",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-dce9ee800b5c5b9cf0466c0a68294a29",
      "reg_record_id": "REGREC-eaa7a917ae70",
      "reg_relay_tx_id": "CHAINMAKER-fc651e065b917733ebf71826c014c610",
      "retry_of": "",
      "signature": "MGYEIKr/14XlwjyjNpqi7AEVnwP3CCF/eZIR1Q1oDdKC6/yYA0IABFA6iu5YNzQuUql0/pU6yLM0RwJ/TN+3xX0wABZKGf6AcZSDovpkI/Tx4b0xdUFGZCVHQvi/IseL0LXjhtXlwbg=",
      "sm3_hash": "2415ada93c6f4314f8d6e56468afd733ec356f2d08383fab9c0d7af9ac54c5c3",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-52e36d043d0e2d9f71b59117e783da28",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-9866b543c0781e937f1fc6b4c55d31c5",
      "updated_at": "2026-10-13 15:17:44.243",
      "verify_result": "PASS"
     },
     {
      "business_id": "PASS-2026-001",
      "created_at": "2026-10-13 15:17:44.230",
      "cross_tx_id": "CX-334e4b53897a",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "6cf6ad87e7ca30944f0ef5f2754e605446dcb43f46cc058b29fbaef3410a8582",
      "latency_ms": 2,
      "message_type": "FLIGHT_PASS",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-f8c335a1cb006a54fcf0b65a0ba0c11d",
      "reg_record_id": "REGREC-a7041fa64401",
      "reg_relay_tx_id": "CHAINMAKER-280f63ecfa8a2029e2e51ce8629685f9",
      "retry_of": "",
      "signature": "MGYEIAcDmMtqCsxGcyLqFyXeJpNC/pyiqt05XCiIC6MVFHixA0IABDH8fdMxhUOgzvuCKNLvU3ZMwpqkv7lTtuZtn+w4AdBacM16jT9aeKXm/iqUNjhCosuQ0FKKt3Qy4PQBr85mYKQ=",
      "sm3_hash": "5d5ac694a0e647caa8599c05fafe90b7e1b464fb758fea34270ed6981d05e010",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-08c9b6d36ce5413c83db2927cc54dd5f",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-439e5ae98e9c43954867bc917f6e7e87",
      "updated_at": "2026-10-13 15:17:44.233",
      "verify_result": "PASS"
     },
     {
      "business_id": "REV-27f738cbf4f9",
      "created_at": "2026-10-13 15:17:44.223",
      "cross_tx_id": "CX-0794736b1d17",
      "error_code": 0,
      "final_target_chain": "fabric",
      "idempotency_key": "47c4f81bbe9d3c67de6c537439231b7b848b9aa22271567faded48894a13741c",
      "latency_ms": 3,
      "message_type": "MISSION_REVIEW_RESULT",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-10dbc357fb46856a20238baf6479fafa",
      "reg_record_id": "REGREC-4aeea1f37eb1",
      "reg_relay_tx_id": "CHAINMAKER-56db713859990600d6433e811a9640b2",
      "retry_of": "",
      "signature": "MGYEIH2tX3AsQ7gfbc2xN9PjpvDhCrIsX2i++jcczVBR5FIeA0IABDaCnpLLzWRUzWUAsJIjFpYq+Z4NDlF7KPTY1PIGMiAvIQt+r4xT9CGIoLUACAdKOtRpI60QC0fL8eMme/qAzCM=",
      "sm3_hash": "8fe32749d82fcef3bfc00ea9a24560a5ed0c0f6dad41602080cfa307dbb2e09f",
      "sm9_identity": "SM9-ID-FISCO-ADMIN",
      "source_chain": "fisco-bcos",
      "source_chain_tx_id": "FISCO-BCOS-0dedac6e184e9d49a9d78bdfc39ba0c2",
      "status": "SUCCESS",
      "target_chain_tx_id": "FABRIC-c117b7d7022f38e4911faefa570d6c38",
      "updated_at": "2026-10-13 15:17:44.226",
      "verify_result": "PASS"
     },
     {
      "business_id": "APP-20261013-c2d3ee",
      "created_at": "2026-10-13 15:17:44.219",
      "cross_tx_id": "CX-a79e8e0e09b1",
      "error_code": 0,
      "final_target_chain": "fisco-bcos",
      "idempotency_key": "093d071ea9e128df0479c75b487a71dc5a18422c74ab011c79f81637cf1f52b4",
      "latency_ms": 2,
      "message_type": "MISSION_APPLICATION",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-aef0a2398cde5aa8d50cb1114bc13033",
      "reg_record_id": "REGREC-d37f61b605ad",
      "reg_relay_tx_id": "CHAINMAKER-9156d8bc6a5704bf07d81c55dcdb433b",
      "retry_of": "",
      "signature": "MGYEIBt4FrQLqCXdx0UCbgyfh+TLGtnD49BRORNxm1cXXlLrA0IABGxs631V5RP1ExIEHGvaletN7G+co+1zgSX1UQP1EM4wQEqSM9ir9wq7WT8PyQGI4PCfRhBInsw1IYUeU3oUvyw=",
      "sm3_hash": "d29a303817150114ef42cc9540d17d8aeb1b13d083214d3218a39080214b6018",
      "sm9_identity": "SM9-ID-Operator-A",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-93f78b2f745a7b2d7b22f2c6fb8122a1",
      "status": "SUCCESS",
      "target_chain_tx_id": "FISCO-BCOS-f3cd2101f64b861cf27831769dd7a68a",
      "updated_at": "2026-10-13 15:17:44.221",
      "verify_result": "PASS"
     },
     {
      "business_id": "UAV-DOC-001",
      "created_at": "2026-10-13 15:17:44.204",
      "cross_tx_id": "CX-ead1cb1594dd",
      "error_code": 0,
      "final_target_chain": "chainmaker",
      "idempotency_key": "e96d6a7b347e180add22c6f67dcd1e8f5a1b5d21b05fe9073bbac0fa58c764c9",
      "latency_ms": 3,
      "message_type": "UAV_REGISTER_PROOF",
      "policy_result": "PASS",
      "reg_receive_tx_id": "CHAINMAKER-afb306b0f993121ca7c4044d5567e688",
      "reg_record_id": "REGREC-f05248e0a158",
      "reg_relay_tx_id": "CHAINMAKER-c62eb0675575046769d96bb2fc8c8ba8",
      "retry_of": "",
      "signature": "MGYEIC/OSGB0swrFjSjQEVBAlSc6mqUp3VWfqamq3ZMxf1D1A0IABHAJ/rwvOAe0UVvHusNNtta9bnnB3Y0tagUYH/+nA5YxPrLJ/IFpwLvbL8UO0jiqEK4bd15MxE9AnSpVw4wjy2w=",
      "sm3_hash": "751407a1789478f6d055d713b4b0d78f5d946b7ce4eaec9a75dddcc1b210482c",
      "sm9_identity": "SM9-ID-UAV-DOC-001",
      "source_chain": "fabric",
      "source_chain_tx_id": "FABRIC-776de8b441c9f4f91dc2ec33263e9828",
      "status": "SUCCESS",
      "target_chain_tx_id": "CHAINMAKER-87e4bb4581dfe616507211e01ebf5d83",
      "updated_at": "2026-10-13 15:17:44.207",
      "verify_result": "PASS"
     }
    ],
    "total": 6
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.274",
   "trace_id": "TRACE-20261013-737034"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.299",
   "trace_id": "TRACE-20261013-980418"
  }
 },
 {
  "path": "/api/crosschain/query",
  "tag": "跨链网关",
  "summary": "跨链交易查询（四段 TxID/验签结果/时延）",
  "operationId": "crosschainQuery",
  "req": {
   "cross_tx_id": "CX-9c2600733c8f"
  },
  "resp": {
   "code": 0,
   "data": {
    "business_id": "UAV-A-001",
    "created_at": "2026-10-13 15:17:44.270",
    "cross_tx_id": "CX-9c2600733c8f",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 2,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-04c5365d92da78607c64bbed8504fdcb",
    "reg_record_id": "REGREC-f460d3f0f07a",
    "reg_relay_tx_id": "CHAINMAKER-b014242c841564afe4d50fb86f5d76bb",
    "retry_of": "",
    "signature": "MGYEIDvrLF79zOEhux97DTVW0fe/GiJTINFkGrcYQ5Xnc5qjA0IABABLgcK5pO8wfZTaUuNe+8NVR1rI+47+lkI7ciuxdYPMLvjhhnbZn/aIKDRX7MVKmo4wYqDRHw1jCOhYaOSrvXg=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-af63eaf8d263c511b3ff6c4abced3a9f",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 15:17:44.273",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.273",
   "trace_id": "TRACE-20261013-1b9715"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainQueryReq",
   "timestamp": "2026-10-13 15:17:44.299",
   "trace_id": "TRACE-20261013-fcc24a"
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
    "created_at": "2026-10-13 15:17:44.270",
    "cross_tx_id": "CX-9c2600733c8f",
    "error_code": 0,
    "final_target_chain": "chainmaker",
    "idempotency_key": "42e1e19c143d5f999df2d44f70cb28994de179d492036bd077a9530e7b2df48a",
    "latency_ms": 2,
    "message_type": "UAV_REGISTER_PROOF",
    "policy_result": "PASS",
    "reg_receive_tx_id": "CHAINMAKER-04c5365d92da78607c64bbed8504fdcb",
    "reg_record_id": "REGREC-f460d3f0f07a",
    "reg_relay_tx_id": "CHAINMAKER-b014242c841564afe4d50fb86f5d76bb",
    "retry_of": "",
    "signature": "MGYEIDvrLF79zOEhux97DTVW0fe/GiJTINFkGrcYQ5Xnc5qjA0IABABLgcK5pO8wfZTaUuNe+8NVR1rI+47+lkI7ciuxdYPMLvjhhnbZn/aIKDRX7MVKmo4wYqDRHw1jCOhYaOSrvXg=",
    "sm3_hash": "03498f970c993e589254eb2d0c6eea6fd22bda0935c8e72cf5bdc693e9409eed",
    "sm9_identity": "SM9-ID-UAV-A-001",
    "source_chain": "fabric",
    "source_chain_tx_id": "FABRIC-af63eaf8d263c511b3ff6c4abced3a9f",
    "status": "SUCCESS",
    "target_chain_tx_id": "CHAINMAKER-78efe3f91e8fb98d02dede45a842c107",
    "updated_at": "2026-10-13 15:17:44.273",
    "verify_result": "PASS"
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.273",
   "trace_id": "TRACE-20261013-b28fcf"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type api.crosschainSendReq",
   "timestamp": "2026-10-13 15:17:44.299",
   "trace_id": "TRACE-20261013-b3ba3f"
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
    "generated_at": "2026-10-13 15:17:44.274",
    "recent_alerts": [
     {
      "alert_id": "ALERT-2026-001",
      "created_at": "2026-10-13 15:17:44.259",
      "event_type": "ROUTE_DEVIATION",
      "evidence_hash": "d40fa926a8e49341a85c3799bd3860b6663223378f87124733ab0b996e94f6ad",
      "mission_id": "MISSION-2026-001",
      "risk_level": "HIGH",
      "source_system": "MANUAL",
      "status": "IDENTIFIED",
      "uav_pseudonym": "PSEUDO-UAV-83921",
      "updated_at": "2026-10-13 15:17:44.261"
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
   "timestamp": "2026-10-13 15:17:44.275",
   "trace_id": "TRACE-20261013-b800de"
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
    "generated_at": "2026-10-13 15:17:44.299",
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
   "timestamp": "2026-10-13 15:17:44.300",
   "trace_id": "TRACE-20261013-683b19"
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
    "content": "experiment_id,run_id,experiment_type,scenario,status,count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms,failed_count,failure_reasons,started_at,completed_at\nEXP-20261013-4ccc6e,RUN-657cd295e6b0,SM3_INTEGRITY,,DONE,5,5,1,0,0,0,0,0,{},2026-10-13 15:17:44.277,2026-10-13 15:17:44.277\n",
    "format": "csv",
    "rows": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.280",
   "trace_id": "TRACE-20261013-20b539"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.301",
   "trace_id": "TRACE-20261013-8a8493"
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
      "completed_at": "2026-10-13 15:17:44.277",
      "config": "{}",
      "count": 5,
      "experiment_id": "EXP-20261013-4ccc6e",
      "experiment_type": "SM3_INTEGRITY",
      "failed_count": 0,
      "failure_reasons": "{}",
      "max_latency_ms": 0,
      "p50_latency_ms": 0,
      "p95_latency_ms": 0,
      "run_id": "RUN-657cd295e6b0",
      "scenario": "",
      "started_at": "2026-10-13 15:17:44.277",
      "status": "DONE",
      "success_count": 5,
      "success_rate": 1
     }
    ],
    "total": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.279",
   "trace_id": "TRACE-20261013-ec8d39"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "请求体格式错误",
   "timestamp": "2026-10-13 15:17:44.301",
   "trace_id": "TRACE-20261013-1e8018"
  }
 },
 {
  "path": "/api/experiment/result",
  "tag": "实验",
  "summary": "实验结果查询（成功率/时延分位/失败原因）",
  "operationId": "experimentResult",
  "req": {
   "run_id": "RUN-657cd295e6b0"
  },
  "resp": {
   "code": 0,
   "data": {
    "avg_latency_ms": 0,
    "completed_at": "2026-10-13 15:17:44.277",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-4ccc6e",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-657cd295e6b0",
    "scenario": "",
    "started_at": "2026-10-13 15:17:44.277",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.279",
   "trace_id": "TRACE-20261013-aeb31e"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type struct { RunID string \"json:\\\"run_id\\\" binding:\\\"required\\\"\" }",
   "timestamp": "2026-10-13 15:17:44.300",
   "trace_id": "TRACE-20261013-a4410f"
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
    "completed_at": "2026-10-13 15:17:44.277",
    "config": "{}",
    "count": 5,
    "experiment_id": "EXP-20261013-4ccc6e",
    "experiment_type": "SM3_INTEGRITY",
    "failed_count": 0,
    "failure_reasons": "{}",
    "max_latency_ms": 0,
    "p50_latency_ms": 0,
    "p95_latency_ms": 0,
    "run_id": "RUN-657cd295e6b0",
    "scenario": "",
    "started_at": "2026-10-13 15:17:44.277",
    "status": "DONE",
    "success_count": 5,
    "success_rate": 1
   },
   "message": "success",
   "timestamp": "2026-10-13 15:17:44.277",
   "trace_id": "TRACE-20261013-78f7b7"
  },
  "err": {
   "code": 6002,
   "data": null,
   "message": "参数错误: json: cannot unmarshal array into Go value of type experiment.RunRequest",
   "timestamp": "2026-10-13 15:17:44.300",
   "trace_id": "TRACE-20261013-6f9d7d"
  }
 }
];
window.TAG_ORDER = ["基础", "密码学", "演示", "主数据", "UOM登记", "无人机", "任务", "审核", "冲突", "通行许可", "链下网络", "会话", "消息", "遥测", "攻防", "告警", "追踪", "授权", "核查", "监管审计", "审计", "跨链网关", "驾驶舱", "实验"];
