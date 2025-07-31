'use client';

import { parseAndRenderMessage } from '@/components/chatParser';
import { ChatMonitoringMessage } from '@/types/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import '../lib/envConfig'
interface ServerStats {
    onlinePlayers: number;
    totalRooms: number;
    uptime: string;
    memoryUsage: string; // e.g., '123 MB'
}

interface Player {
    id: string;
    socketId: string;
    username: string;
    roomId: string;
    roomName: string;
    connected: boolean;
    hosting: boolean;
    local: boolean;
}

interface Room {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
}

const AdminDashboard = () => { // Encapsulate the component logic in a function
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [stats, setStats] = useState<ServerStats>({
        onlinePlayers: 0,
        totalRooms: 0,
        uptime: '0:00:00',
        memoryUsage: '0 MB'
    });
    const [players, setPlayers] = useState<Player[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMonitoringMessage[]>([]);
    const [commandInput, setCommandInput] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<string>('global');
    const [chatInput, setChatInput] = useState('');
    const router = useRouter();

    // Logout handler
    const handleLogout = useCallback(async () => {
        await fetch('/admin/logout', { method: 'POST' });
        router.replace('/admin/login');
    }, [router]);

    useEffect(() => {
        // Connect to socket server
        const newSocket = io('http://localhost:8880', {
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            setConnected(true);
            console.log('Connected to server');
            // Register as a web client to receive data
            newSocket.emit('webClient');
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
            console.log('Disconnected from server');
        });

        // Listen for the actual webClient data updates from the server
        newSocket.on('webClient', (data: any) => {
            console.log('Received webClient data:', data);
            console.log('Data type:', typeof data);
            console.log('Data keys:', Object.keys(data));
            console.log('Rooms data:', data.rooms);
            console.log('Player count:', data.playerCount);
            console.log('Uptime:', data.uptime);
            console.log('Memory usage:', data.memoryUsage);

            // Update stats using the actual server data structure
            setStats({
                onlinePlayers: data.playerCount || 0,
                totalRooms: data.rooms?.length || 0,
                uptime: data.uptime || '0:00:00',
                memoryUsage: data.memoryUsage + " MB"
            });

            // Convert rooms data to our format
            if (data.rooms) {
                console.log('Processing rooms:', data.rooms);
                const formattedRooms = data.rooms.map((room: any) => {
                    console.log('Processing room:', room);
                    return {
                        id: room.RoomID,
                        name: room.RoomName,
                        playerCount: room.RoomPlayerCount,
                        maxPlayers: room.RoomPlayerMax
                    };
                });
                console.log('Formatted rooms:', formattedRooms);
                setRooms(formattedRooms);
            }

            // Handle players data from server
            if (data.players) {
                console.log('Processing players:', data.players);
                setPlayers(data.players);
            } else {
                setPlayers([]);
            }
        });

        // Listen for chat messages
        newSocket.on('forwardedChatMessage', (message: ChatMonitoringMessage) => {
            setChatMessages(prev => [...prev.slice(-49), message]);
        });

        // Listen for player kick confirmations
        newSocket.on('playerKicked', (data: any) => {
            setChatMessages(prev => [...prev.slice(-49), {
                senderId: '0',
                senderName: 'System',
                message: `Player ${data.playerId} was kicked. Reason: ${data.reason}`,
                timestamp: data.timestamp,
                roomId: 'System',
                roomName: 'System'
            }]);
        });

        // Listen for admin errors
        newSocket.on('adminError', (error: any) => {
            setChatMessages(prev => [...prev.slice(-49), {
                senderId: '0',
                senderName: 'Error',
                message: error.message,
                timestamp: Date.now(),
                roomId: 'System',
                roomName: 'System'
            }]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const sendChatMessage = () => {
        if (socket && chatInput.trim()) {
            socket.emit('adminChat', {
                message: chatInput,
                roomId: selectedRoom === 'global' ? undefined : selectedRoom,
                global: selectedRoom === 'global'
            });
            setChatInput('');
        }
    };

    const kickPlayer = (playerId: string, reason?: string) => {
        if (socket) {
            socket.emit('kickPlayer', { playerId, reason: reason || 'No reason provided' });
        }
    };

    const closeRoom = (roomId: string) => {
        if (socket) {
            socket.emit('admin-close-room', roomId);
        }
    };

    if (process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL !== 'true') {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Admin Panel Disabled</h1>
                    <p className="text-lg">The admin panel is currently disabled. Please enable it in the environment variables.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">ProtoShock Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-lg ${connected ? 'bg-green-600' : 'bg-red-600'}`}>{connected ? 'Connected' : 'Disconnected'}</div>
                        <button
                            onClick={handleLogout}
                            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm border border-gray-500"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Online Players</h3>
                        <p className="text-3xl font-bold text-blue-400">{stats.onlinePlayers}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Active Rooms</h3>
                        <p className="text-3xl font-bold text-green-400">{stats.totalRooms}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Uptime</h3>
                        <p className="text-3xl font-bold text-purple-400">{stats.uptime}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
                        <p className="text-3xl font-bold text-pink-400">{stats.memoryUsage}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Players Panel */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Online Players</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {players.length === 0 ? (
                                <p className="text-gray-400">No players online</p>
                            ) : (
                                players.map((player) => (
                                    <div key={player.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                        <div>
                                            <span className="font-medium">{player.username || player.id}</span>
                                            <span className="text-gray-400 ml-2">({player.roomName || 'Lobby'})</span>
                                        </div>
                                        <button
                                            onClick={() => kickPlayer(player.id)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                                        >
                                            Kick
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Rooms Panel */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Active Rooms</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {rooms.length === 0 ? (
                                <p className="text-gray-400">No active rooms</p>
                            ) : (
                                rooms.map((room) => (
                                    <div key={room.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                        <div>
                                            <span className="font-medium">{room.name}</span>
                                            <span className="text-gray-400 ml-2">({room.playerCount}/{room.maxPlayers})</span>
                                        </div>
                                        <button
                                            onClick={() => closeRoom(room.id)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                                        >
                                            Close
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat */}
                <div className="mt-8 bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Chat</h2>

                    {/* Room Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Target Room:</label>
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full"
                        >
                            <option value="global">Global (All Players)</option>
                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name} ({room.playerCount} players)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chat Messages Display */}
                    <div className="bg-gray-900 rounded p-4 h-48 overflow-y-auto mb-4">
                        {chatMessages.length === 0 ? (
                            <p className="text-gray-400">No recent chat messages</p>
                        ) : (
                            chatMessages.map((msg, index) => {
                                // 👇 2. Parse each message
                                const parsed = parseAndRenderMessage(msg.message);

                                if (parsed.isSystemEvent) {
                                    // Render for join/leave events
                                    return (
                                        <div key={index} className="text-sm mb-2">
                                            {parsed.renderedContent}
                                            <span className="text-gray-500 ml-2 text-xs">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    );
                                }

                                // Render for standard chat messages
                                return (
                                    <div key={index} className="text-sm mb-2">
                                        <span className="text-blue-400 font-medium">[{msg.roomName}]</span>
                                        <span className="text-green-400 ml-2">{msg.senderName}:</span>
                                        <span className="text-gray-300 ml-2">{parsed.renderedContent}</span>
                                        <span className="text-gray-500 ml-2 text-xs">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder={`Send message to ${selectedRoom === 'global' ? 'all players' : 'selected room'}...`}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        />
                        <button
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;