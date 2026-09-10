package main

import "testing"

func TestRunRejectsEmptyAddr(t *testing.T) {
	if err := Run(""); err == nil {
		t.Fatal("expected error for empty addr")
	}
}
