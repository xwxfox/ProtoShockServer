'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin, Crosshair, Heart, Shield } from 'lucide-react'

interface PlayerPosition {
    id: string
    name?: string
    x: number
    y: number
    z: number
    health: number
    team?: number
    isHost: boolean
}

interface MinimapProps {
    players: PlayerPosition[]
    roomName?: string
    mapBounds?: {
        minX: number
        maxX: number
        minZ: number
        maxZ: number
    }
}

export default function Minimap({ players, roomName, mapBounds }: MinimapProps) {
    const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null)

    // Default map bounds if not provided
    const bounds = mapBounds || { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }

    // Convert world coordinates to minimap coordinates
    const worldToMinimap = (x: number, z: number) => {
        const mapWidth = 300
        const mapHeight = 300

        const normalizedX = (x - bounds.minX) / (bounds.maxX - bounds.minX)
        const normalizedZ = (z - bounds.minZ) / (bounds.maxZ - bounds.minZ)

        return {
            x: normalizedX * mapWidth,
            y: (1 - normalizedZ) * mapHeight // Flip Z coordinate for screen space
        }
    }

    const getPlayerColor = (player: PlayerPosition) => {
        if (player.health <= 0) return '#ef4444' // red for dead
        if (player.isHost) return '#f59e0b' // amber for host
        if (player.team === 0) return '#3b82f6' // blue for team 1
        if (player.team === 1) return '#ef4444' // red for team 2
        return '#10b981' // green for no team
    }

    const getPlayerIcon = (player: PlayerPosition) => {
        if (player.health <= 0) return '💀'
        if (player.isHost) return '👑'
        return '🎮'
    }

    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Minimap
                    </CardTitle>
                    {roomName && (
                        <Badge variant="outline" className="text-white">
                            {roomName}
                        </Badge>
                    )}
                </div>
                <CardDescription>Real-time player positions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Minimap Grid */}
                    <div
                        className="relative bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
                        style={{ width: '300px', height: '300px' }}
                    >
                        {/* Grid Lines */}
                        <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ pointerEvents: 'none' }}
                        >
                            {/* Vertical lines */}
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <line
                                    key={`v-${i}`}
                                    x1={i * 60}
                                    y1={0}
                                    x2={i * 60}
                                    y2={300}
                                    stroke="#4b5563"
                                    strokeWidth={1}
                                    opacity={0.3}
                                />
                            ))}
                            {/* Horizontal lines */}
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <line
                                    key={`h-${i}`}
                                    x1={0}
                                    y1={i * 60}
                                    x2={300}
                                    y2={i * 60}
                                    stroke="#4b5563"
                                    strokeWidth={1}
                                    opacity={0.3}
                                />
                            ))}

                            {/* Center cross */}
                            <line x1={150} y1={140} x2={150} y2={160} stroke="#6b7280" strokeWidth={2} />
                            <line x1={140} y1={150} x2={160} y2={150} stroke="#6b7280" strokeWidth={2} />
                        </svg>

                        {/* Players */}
                        {players.map((player) => {
                            const pos = worldToMinimap(player.x, player.z)
                            return (
                                <div
                                    key={player.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125"
                                    style={{
                                        left: `${pos.x}px`,
                                        top: `${pos.y}px`,
                                    }}
                                    onMouseEnter={() => setHoveredPlayer(player.id)}
                                    onMouseLeave={() => setHoveredPlayer(null)}
                                >
                                    {/* Player dot */}
                                    <div
                                        className="w-4 h-4 rounded-full border-2 border-white shadow-lg relative"
                                        style={{ backgroundColor: getPlayerColor(player) }}
                                    >
                                        {/* Health indicator */}
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-red-500 rounded-b-full"
                                            style={{
                                                height: `${Math.max(0, 100 - player.health)}%`,
                                                opacity: 0.7
                                            }}
                                        />
                                    </div>

                                    {/* Player name tooltip */}
                                    {hoveredPlayer === player.id && (
                                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                            <div className="text-center">
                                                <div className="font-medium">{player.name || player.id}</div>
                                                <div className="text-gray-300">
                                                    Health: {Math.round(player.health)}% {getPlayerIcon(player)}
                                                </div>
                                                <div className="text-gray-400 text-xs">
                                                    {Math.round(player.x)}, {Math.round(player.y)}, {Math.round(player.z)}
                                                </div>
                                            </div>
                                            {/* Tooltip arrow */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black border-opacity-90" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 border border-white" />
                            <span className="text-gray-300">Host</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
                            <span className="text-gray-300">Team 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 border border-white" />
                            <span className="text-gray-300">Team 2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
                            <span className="text-gray-300">No Team</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-white">{players.length}</div>
                            <div className="text-xs text-gray-400">Players</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {players.filter(p => p.health > 0).length}
                            </div>
                            <div className="text-xs text-gray-400">Alive</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {Math.round(players.reduce((sum, p) => sum + p.health, 0) / players.length) || 0}%
                            </div>
                            <div className="text-xs text-gray-400">Avg Health</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
