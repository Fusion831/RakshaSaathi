import { useEffect, useState, useRef } from 'react';
	export function useWebSocket(url: string) {
	const [messages, setMessages] = useState<any[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const ws = useRef<WebSocket | null>(null);
	
	useEffect(() => {
	ws.current = new WebSocket(url);
	ws.current.onopen = () => setIsConnected(true);
	ws.current.onclose = () => setIsConnected(false);
	ws.current.onmessage = (e) => {
	try {
	setMessages(prev => [...prev, JSON.parse(e.data)]);
	} catch(err) {}
	};
	return () => { ws.current?.close(); };
	}, [url]);

	return { messages, isConnected, ws: ws.current };

}
