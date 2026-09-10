package model

import (
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func AllModels() []any {
	return []any{
		&Manufacturer{}, &Operator{}, &UAV{},
		&RouteSegment{}, &Mission{}, &MissionApplication{}, &ReviewRecord{},
		&ConflictRecord{}, &FlightPass{},
		&CrosschainTx{},
		&NetworkNode{}, &OffchainSession{}, &OffchainMessage{}, &WormholeEvent{},
		&SecurityEvent{}, &IdentityMapping{}, &RegulatoryAuth{}, &RegulatoryAudit{},
		&ExperimentRun{}, &AuditLog{},
	}
}

func Open(dbPath string) (*gorm.DB, error) {
	dsn := dbPath
	if dbPath != ":memory:" {
		if dir := filepath.Dir(dbPath); dir != "." && dir != "" {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return nil, err
			}
		}
	}
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(AllModels()...)
}
