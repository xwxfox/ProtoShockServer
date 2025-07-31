'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from 'dotenv'
config({
  path: process.cwd() + "./" + (process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development')
})
export default function Home() {
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<string>("owo");
  const [serverData, setServerData] = useState({
    playerCount: 0,
    roomsCount: 0,
    rooms: [],
    memoryUsage: '0 MB',
    countryCode: 'UK',
    uptime: '0:00:00'
  });

  useEffect(() => {
    setLocation(window.location.hostname);
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost';
    const socketPort = process.env.NEXT_PUBLIC_SOCKET_SERVER_PORT || '8880';
    const socketServer = `${process.env.NEXT_PUBLIC_SHOW_PORT_IN_SERVER_IP === "false" ? socketUrl : `${socketUrl}:${socketPort}`}`;
    const getFirstInfo = async () => {
      try {
        const response = await fetch(`${socketServer}/health`);
        if (response.ok) {
          setIsOnline(true);
          setServerData(await response.json());
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setIsOnline(false);
      }
    };
    getFirstInfo();

    const socket = io(socketServer, {
      transports: ['websocket', 'polling']
    });

    socket.emit('webClient', {});

    socket.on('disconnect', () => {
      setIsOnline(false);
    });

    socket.on('webClient', (data: any) => {
      setServerData(data);
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            ProtoShock Server
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            beep beeps with pew pews
          </p>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Server IP: <span className="font-bold">{location}{process.env.NEXT_PUBLIC_SHOW_PORT_IN_SERVER_IP === "true" ? ":" + process.env.NEXT_PUBLIC_APP_PORT : ''}</span>
            {/* Click to copy */}
            <button
              className="ml-2 text-blue-400 hover:text-blue-300 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(`${location}${process.env.NEXT_PUBLIC_SHOW_PORT_IN_SERVER_IP === "true" ? ":" + process.env.NEXT_PUBLIC_APP_PORT : ''}`);
              }}
            >
              Copy IP
            </button>
          </p>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className={`text-3xl font-bold mb-2 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <div className="text-gray-300">Server Status</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{serverData.playerCount}</div>
            <div className="text-gray-300">Online Players</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{serverData.roomsCount}</div>
            <div className="text-gray-300">Active Rooms</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{serverData.uptime}</div>
            <div className="text-gray-300">Uptime</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{serverData.memoryUsage}</div>
            <div className="text-gray-300">Memory Usage</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-pink-400 mb-2">{serverData.countryCode || 'N/A'}</div>
            <div className="text-gray-300">Country Code</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          {process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL === 'true' && (
            <Link
              href="/admin"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Open Admin Dashboard
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-400">
          <p>Built with ❤️ by the Sex Team</p>
        </div>
      </div>
    </div>
  );
}
