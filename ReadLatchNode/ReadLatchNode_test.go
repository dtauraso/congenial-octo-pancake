// Phase 7 follow-up — ReadLatch unit test.
//
// Buffer-and-release: send a value on `in`, then send a release token,
// expect the held value out plus an ack. Releases without a buffered
// value are observable as a recv with no fire/sends.

package ReadLatchNode_test

import (
	"context"
	"sync"
	"testing"
	"time"

	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/ReadLatchNode"
	tr "github.com/dtauraso/wirefold/Trace"
)

func TestReadLatch_BufferAndRelease(t *testing.T) {
	trace := tr.New(64)

	in := make(chan int, 1)
	rel := make(chan int, 1)
	out := make(chan int, 1)
	ack := make(chan int, 1)

	rl := ReadLatchNode{Name: "rl", FromIn: in, FromRelease: rel, ToNext: out, ToAck: ack}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: trace}
	go rl.Update(&s)

	in <- 5
	// Brief sleep so the select definitely consumes `in` before `release`
	// — without it, the Go scheduler may pick release first and drop it.
	time.Sleep(2 * time.Millisecond)
	rel <- 1

	select {
	case v := <-out:
		if v != 5 {
			t.Fatalf("out=%d, want 5", v)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("rl never emitted on out")
	}
	select {
	case v := <-ack:
		if v != 1 {
			t.Fatalf("ack=%d, want 1", v)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("rl never emitted on ack")
	}

	cancel()
	wg.Wait()
	trace.Close()

	events := trace.Events()
	// Expect at least: recv(in,5), recv(release,1), fire, send(out,5), send(ack,1).
	want := map[string]int{
		"recv:rl/in=5":      1,
		"recv:rl/release=1": 1,
		"fire:rl":           1,
		"send:rl/out=5":     1,
		"send:rl/ack=1":     1,
	}
	got := map[string]int{}
	for _, e := range events {
		switch e.Kind {
		case tr.KindRecv:
			got[projKey("recv", e.Node, e.Port, e.Value)]++
		case tr.KindFire:
			got["fire:"+e.Node]++
		case tr.KindSend:
			got[projKey("send", e.Node, e.Port, e.Value)]++
		}
	}
	for k, n := range want {
		if got[k] != n {
			t.Errorf("%q: got %d, want %d (full: %+v)", k, got[k], n, events)
		}
	}
}

func TestReadLatch_ReleaseWithoutHeld_NoFire(t *testing.T) {
	trace := tr.New(64)

	in := make(chan int, 1)
	rel := make(chan int, 1)
	out := make(chan int, 1)
	ack := make(chan int, 1)

	rl := ReadLatchNode{Name: "rl", FromIn: in, FromRelease: rel, ToNext: out, ToAck: ack}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: trace}
	go rl.Update(&s)

	rel <- 1
	time.Sleep(5 * time.Millisecond)

	select {
	case v := <-out:
		t.Fatalf("unexpected out=%d on release-without-held", v)
	default:
	}

	cancel()
	wg.Wait()
	trace.Close()

	for _, e := range trace.Events() {
		if e.Kind == tr.KindFire {
			t.Errorf("unexpected fire on release-without-held: %+v", e)
		}
	}
}

func projKey(kind, node, port string, value int) string {
	return kind + ":" + node + "/" + port + "=" + itoa(value)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
