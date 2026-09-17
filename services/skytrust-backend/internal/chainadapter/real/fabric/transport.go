//go:build realchains

// Package realfabric 提供 Fabric 运营链真实 SDK 传输（docs/real-chain-migration.md §5-②）。
// 指南骨架按早期 fabric-gateway API 书写并注明「编译前按所选 fabric-gateway 版本核对
// API 名与 import 路径」；本实现按实际解析版本 v1.12.1 核对适配（语义不变）：
//   - identity.NewPrivateKeySign 收 crypto.PrivateKey（先 identity.PrivateKeyFromPEM 解析）；
//   - client.Connect 收 identity.Identity（identity.NewX509Identity(mspID, cert)，
//     取代骨架的 WithIdentity(mspID, cert) 选项）；
//   - proposal.Endorse()（无参；签名器即 Connect WithSign 注入者，骨架 Endorse(nil) 为笔误）；
//   - commit.StatusWithContext(ctx) 取代骨架的 commit.Result()，*Status 为纯结构体
//     （Code=peer.TxValidationCode，BlockNumber 字段）；
//   - EvaluateWithContext 的实参经 client.WithArguments(...) 包装；
//   - fabric-protos-go-apiv2 v0.3.7 无独立 protos 包——Payload/ChannelHeader 与
//     Block/Envelope 同属 common 包（骨架的 protos.* 即此二者）。
package realfabric

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/protobuf/proto"

	"skytrust-backend/internal/chainadapter"
)

// contractName 与后端固化常量逐字一致（internal/crosschain/policy.go:69
// ContractFabricOperator；白名单 internal/chainadapter/fabric/adapter.go:17）。
const contractName = "operator_business"

// Transport 以 fabric-gateway 实现 chainadapter.ChainTransport。
type Transport struct {
	conn      *grpc.ClientConn
	gateway   *client.Gateway
	network   *client.Network
	contract  *client.Contract
	channelID string
}

// NewFactory 即 chainadapter.TransportFactory（transport.go:25：func() (ChainTransport, error)）。
func NewFactory() (chainadapter.ChainTransport, error) {
	certPEM, err := os.ReadFile(os.Getenv("FABRIC_CERT_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read client cert: %w", err)
	}
	cert, err := identity.CertificateFromPEM(certPEM)
	if err != nil {
		return nil, fmt.Errorf("fabric: parse client cert: %w", err)
	}
	keyPEM, err := os.ReadFile(os.Getenv("FABRIC_KEY_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read client key: %w", err)
	}
	privKey, err := identity.PrivateKeyFromPEM(keyPEM)
	if err != nil {
		return nil, fmt.Errorf("fabric: parse client key: %w", err)
	}
	sign, err := identity.NewPrivateKeySign(privKey)
	if err != nil {
		return nil, fmt.Errorf("fabric: client key unsupported type: %w", err)
	}
	tlsCertPEM, err := os.ReadFile(os.Getenv("FABRIC_TLS_CERT_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read tls cert: %w", err)
	}
	tlsPool := x509.NewCertPool()
	if !tlsPool.AppendCertsFromPEM(tlsCertPEM) {
		return nil, fmt.Errorf("fabric: tls cert pool invalid")
	}
	endpoint := os.Getenv("FABRIC_PEER_ENDPOINT")
	conn, err := grpc.NewClient(endpoint,
		grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(tlsPool, os.Getenv("FABRIC_TLS_HOST_NAME"))))
	if err != nil {
		return nil, fmt.Errorf("fabric: grpc connect %s: %w", endpoint, err)
	}
	// v1.12.1：Connect 收 identity.Identity（MSP ID 内嵌于 X509Identity，
	// 取代骨架的 WithIdentity(mspID, cert) 选项）。
	fid, err := identity.NewX509Identity(os.Getenv("FABRIC_MSP_ID"), cert)
	if err != nil {
		return nil, fmt.Errorf("fabric: build identity: %w", err)
	}
	gw, err := client.Connect(fid,
		client.WithSign(sign),
		client.WithClientConnection(conn),
		client.WithEvaluateTimeout(15*time.Second),
		client.WithEndorseTimeout(30*time.Second),
		client.WithSubmitTimeout(30*time.Second),
		client.WithCommitStatusTimeout(60*time.Second))
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("fabric: gateway connect: %w", err)
	}
	channel := os.Getenv("FABRIC_CHANNEL_NAME")
	network := gw.GetNetwork(channel)
	return &Transport{
		conn:      conn,
		gateway:   gw,
		network:   network,
		contract:  network.GetContract(contractName),
		channelID: channel,
	}, nil
}

// SubmitTx 提交交易。recordJSON 约定（§4.2）：params map JSON 编码为单一字符串实参，
// 对应链码方法签名 recordJSON string（contracts/fabric/chaincode/main.go）。
func (t *Transport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fabric: contract %q not registered (allowed: %s)", contract, contractName)
	}
	recordJSON, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("fabric: encode recordJSON: %w", err)
	}
	proposal, err := t.contract.NewProposal(method, client.WithArguments(string(recordJSON)))
	if err != nil {
		return nil, fmt.Errorf("fabric: new proposal %s: %w", method, err)
	}
	// Endorse()：使用 Connect 时 WithSign 注入的签名器。
	transaction, err := proposal.Endorse()
	if err != nil {
		return nil, fmt.Errorf("fabric: endorse %s: %w", method, err) // 传输级错误 → withRetry
	}
	commit, err := transaction.Submit()
	if err != nil {
		return nil, fmt.Errorf("fabric: submit %s: %w", method, err) // 传输级错误 → withRetry
	}
	result, err := commit.StatusWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("fabric: commit %s: %w", method, err) // 传输级错误 → withRetry
	}
	receipt := &chainadapter.TxReceipt{
		TxID:      transaction.TransactionID(),
		BlockNum:  result.BlockNumber,
		Status:    int(result.Code),     // peer.TxValidationCode：0 = VALID = 成功
		Ret:       transaction.Result(), // 链码返回值（operator_business 各方法回显主键）
		Timestamp: time.Now(),           // 提交确认时刻；链上精确时间戳可经 QueryTx 解块获得
	}
	return receipt, nil
}

// QueryTx 经系统链码 qscc.GetBlockByTxID 取回区块并解出该交易的验证码/时间戳。
func (t *Transport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	qscc := t.network.GetContract("qscc")
	blockBytes, err := qscc.EvaluateWithContext(ctx, "GetBlockByTxID", client.WithArguments(t.channelID, txID))
	if err != nil {
		return nil, fmt.Errorf("fabric: qscc GetBlockByTxID %s: %w", txID, err)
	}
	block := &common.Block{}
	if err := proto.Unmarshal(blockBytes, block); err != nil {
		return nil, fmt.Errorf("fabric: decode block: %w", err)
	}
	filter := block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]
	for i, raw := range block.Data.Data {
		envelope := &common.Envelope{}
		if err := proto.Unmarshal(raw, envelope); err != nil {
			continue
		}
		payload := &common.Payload{}
		if err := proto.Unmarshal(envelope.Payload, payload); err != nil {
			continue
		}
		channelHeader := &common.ChannelHeader{}
		if err := proto.Unmarshal(payload.Header.ChannelHeader, channelHeader); err != nil {
			continue
		}
		if channelHeader.TxId != txID {
			continue
		}
		receipt := &chainadapter.TxReceipt{
			TxID:     txID,
			BlockNum: block.Header.Number,
			Status:   int(filter[i]), // TxValidationCode：0 = VALID
		}
		if channelHeader.Timestamp != nil {
			receipt.Timestamp = channelHeader.Timestamp.AsTime()
		}
		return receipt, nil
	}
	return nil, fmt.Errorf("fabric: tx %s not found in block returned by qscc", txID)
}

// QueryState 按键读链上状态。operator_business 后端调用面为 6 个写方法，部署期已按
// docs/real-chain-migration.md §5-② 为链码补充只读方法 QueryState(key string)
// （见 contracts/fabric/chaincode/main.go 与 contracts/fabric/README.md 注记）——
// 补充读方法属于部署期链码演进，不触碰后端任何代码。
func (t *Transport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fabric: contract %q not registered (allowed: %s)", contract, contractName)
	}
	return t.contract.EvaluateWithContext(ctx, "QueryState", client.WithArguments(key))
}

// Health 经 qscc.GetChainInfo 探活（/api/chain/status 的数据来源，§6.5）。
func (t *Transport) Health() error {
	qscc := t.network.GetContract("qscc")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := qscc.EvaluateWithContext(ctx, "GetChainInfo", client.WithArguments(t.channelID)); err != nil {
		return fmt.Errorf("fabric: health qscc GetChainInfo: %w", err)
	}
	return nil
}

// Close 释放 gateway 与连接（进程退出钩子调用）。
func (t *Transport) Close() {
	t.gateway.Close()
	t.conn.Close()
}

var _ chainadapter.ChainTransport = (*Transport)(nil)
