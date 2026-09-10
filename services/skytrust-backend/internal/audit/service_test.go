package audit

import (
	"strings"
	"testing"

	"skytrust-backend/internal/model"
)

func TestLogAndQuery(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	s := New(db)
	if err := s.Log("Operator-A", "MISSION_SUBMIT", "MISSION", "MISSION-2026-001", "TRACE-X", map[string]any{"route": []string{"R101"}}); err != nil {
		t.Fatal(err)
	}
	s.Log("REG-01", "TRACE_START", "ALERT", "ALERT-2026-001", "TRACE-Y", nil)
	recs, total, err := s.Query(QueryFilter{BusinessID: "MISSION-2026-001"})
	if err != nil || total != 1 || recs[0].Action != "MISSION_SUBMIT" {
		t.Errorf("query: %v %d %v", recs, total, err)
	}
	if !strings.Contains(recs[0].Detail, "R101") {
		t.Error("detail not persisted")
	}
	_, total2, _ := s.Query(QueryFilter{Actor: "REG-01"})
	if total2 != 1 {
		t.Errorf("actor filter: %d", total2)
	}
	_, total3, _ := s.Query(QueryFilter{})
	if total3 != 2 {
		t.Errorf("all: %d", total3)
	}
}

func TestQueryPaging(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	s := New(db)
	for i := 0; i < 25; i++ {
		s.Log("A", "ACT", "T", "ID", "TR", nil)
	}
	recs, total, _ := s.Query(QueryFilter{Page: 2, PageSize: 20})
	if total != 25 || len(recs) != 5 {
		t.Errorf("paging: total=%d len=%d", total, len(recs))
	}
}

func TestExportCSV(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	s := New(db)
	s.Log("Operator-A", "MISSION_SUBMIT", "MISSION", "MISSION-2026-001", "TRACE-X", map[string]any{"k": "v,with comma"})
	b, err := s.ExportCSV(QueryFilter{})
	if err != nil {
		t.Fatal(err)
	}
	csv := string(b)
	if !strings.HasPrefix(csv, "id,trace_id,actor") {
		t.Error("missing header")
	}
	if !strings.Contains(csv, `"v,with comma"`) && !strings.Contains(csv, "v,with comma") {
		t.Error("detail missing")
	}
}
