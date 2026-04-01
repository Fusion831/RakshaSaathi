package services

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type WSBroadcaster struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewWSBroadcaster() *WSBroadcaster {
	return &WSBroadcaster{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte, 100), // Buffered to prevent blocking
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (b *WSBroadcaster) Start() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client] = true
			b.mu.Unlock()
			log.Println("WS Client registered")

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client]; ok {
				delete(b.clients, client)
				client.Close()
			}
			b.mu.Unlock()
			log.Println("WS Client unregistered")

		case message := <-b.broadcast:
			b.mu.Lock()
			for client := range b.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("WS error: %v", err)
					client.Close()
					delete(b.clients, client)
				}
			}
			b.mu.Unlock()
		}
	}
}

func (b *WSBroadcaster) Register(conn *websocket.Conn) {
	b.register <- conn
}

func (b *WSBroadcaster) Unregister(conn *websocket.Conn) {
	b.unregister <- conn
}

type WSEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func (b *WSBroadcaster) BroadcastEvent(eventType string, payload interface{}) {
	event := WSEvent{
		Type:    eventType,
		Payload: payload,
	}
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal WS event: %v", err)
		return
	}
	b.broadcast <- data
}
