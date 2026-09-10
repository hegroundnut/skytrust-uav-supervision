package timex

import "testing"

func TestParseTimeFormats(t *testing.T) {
	a, err := ParseTime("2026-09-11 08:30:00.000")
	if err != nil {
		t.Fatal(err)
	}
	b, err := ParseTime("2026-09-11 08:30:00")
	if err != nil {
		t.Fatal(err)
	}
	if !a.Equal(b) {
		t.Errorf("dual format mismatch: %v vs %v", a, b)
	}
	if a.Location().String() != "Asia/Shanghai" && a.Location().String() != "CST" {
		t.Errorf("location = %v", a.Location())
	}
	if _, err := ParseTime("2026/09/11"); err == nil {
		t.Error("bad format must error")
	}
}

func TestFormatTimeRoundTrip(t *testing.T) {
	s := "2026-09-11 08:30:00.500"
	tm, err := ParseTime(s)
	if err != nil {
		t.Fatal(err)
	}
	if got := FormatTime(tm); got != s {
		t.Errorf("round trip = %s, want %s", got, s)
	}
}
