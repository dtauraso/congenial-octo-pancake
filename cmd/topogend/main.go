// topogend is a tiny dev-only daemon that accepts JSON spec POSTs from the
// editor, writes topology.json, and re-runs topogen. Run from the project root:
//
//	go run ./cmd/topogend
//
// The editor's Vite dev server proxies /api → http://localhost:8080.
//
// Security: binds to loopback by default, requires a shared-secret token
// (X-Topogend-Token), and restricts CORS / Origin to an allow-listed dev
// origin. The token is read from $TOPOGEND_TOKEN if set, otherwise generated
// at startup and printed to stderr — copy it into the editor's dev config.
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
)

var mu sync.Mutex

type response struct {
	Status  string `json:"status"`
	Bytes   int    `json:"bytes,omitempty"`
	Topogen string `json:"topogen,omitempty"`
	Error   string `json:"error,omitempty"`
}

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "listen address (loopback by default)")
	specPath := flag.String("spec", "topology.json", "spec path to write")
	allowOrigin := flag.String("origin", "http://localhost:5173", "allowed Origin for CORS / Origin checks")
	tokenPath := flag.String("token-file", ".topogend-token", "path to write/read the session token (gitignored)")
	flag.Parse()

	token := os.Getenv("TOPOGEND_TOKEN")
	if token == "" {
		buf := make([]byte, 32)
		if _, err := rand.Read(buf); err != nil {
			log.Fatalf("token generation failed: %v", err)
		}
		token = hex.EncodeToString(buf)
		// Write to a gitignored file so the Vite proxy can pick it up without
		// any manual env coordination. 0600 — owner-only.
		if err := os.WriteFile(*tokenPath, []byte(token), 0600); err != nil {
			log.Fatalf("writing token file %s: %v", *tokenPath, err)
		}
		fmt.Fprintf(os.Stderr, "topogend: wrote session token to %s\n", *tokenPath)
	}

	http.HandleFunc("/spec", func(w http.ResponseWriter, r *http.Request) {
		// Only respond to CORS preflights from the allow-listed origin. Echo
		// back that exact origin (never "*") so credentials/headers can't be
		// abused from arbitrary sites.
		origin := r.Header.Get("Origin")
		if origin != "" && origin != *allowOrigin {
			respond(w, 403, response{Status: "error", Error: "origin not allowed"})
			return
		}
		if origin == *allowOrigin {
			w.Header().Set("Access-Control-Allow-Origin", *allowOrigin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "content-type, x-topogend-token")
		}
		if r.Method == http.MethodOptions {
			return
		}
		if r.Method != http.MethodPost {
			respond(w, 405, response{Status: "error", Error: "POST only"})
			return
		}
		// Constant-time token check.
		got := r.Header.Get("X-Topogend-Token")
		if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
			respond(w, 401, response{Status: "error", Error: "unauthorized"})
			return
		}
		// Belt-and-suspenders: reject simple-content-type POSTs that lack a
		// matching Origin header (defense against CSRF preflight bypass).
		if origin == "" && !strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
			respond(w, 403, response{Status: "error", Error: "missing Origin"})
			return
		}
		handleSpec(w, r, *specPath)
	})

	log.Printf("topogend listening on %s, writing %s", *addr, *specPath)
	log.Fatal(http.ListenAndServe(*addr, nil))
}

func handleSpec(w http.ResponseWriter, r *http.Request, path string) {
	mu.Lock()
	defer mu.Unlock()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		respond(w, 500, response{Status: "error", Error: err.Error()})
		return
	}
	// Validate JSON before writing.
	var v any
	if err := json.Unmarshal(body, &v); err != nil {
		respond(w, 400, response{Status: "error", Error: "invalid JSON: " + err.Error()})
		return
	}
	if err := os.WriteFile(path, body, 0644); err != nil {
		respond(w, 500, response{Status: "error", Error: err.Error()})
		return
	}

	cmd := exec.Command("go", "run", "./cmd/topogen")
	out, err := cmd.CombinedOutput()
	if err != nil {
		respond(w, 500, response{
			Status: "error",
			Error:  fmt.Sprintf("topogen failed: %v\n%s", err, out),
		})
		return
	}

	log.Printf("wrote %s (%d bytes), regenerated wiring.go", path, len(body))
	respond(w, 200, response{Status: "ok", Bytes: len(body), Topogen: string(out)})
}

func respond(w http.ResponseWriter, code int, r response) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(r)
}
