'use client';

import React from 'react';

// The structure of the object our function will return
export interface ParsedMessage {
    isSystemEvent: boolean;
    renderedContent: React.ReactNode;
}

// Regex for join/leave events
const eventRegex = /<color=.*?>\s*(\S+)\s+(Joined!|left)\s*<\/color>/i;

// Regex for death messages: <color=red>victim was killed by killer</color>
const deathRegex = /<color=red>\s*(.*?)\s+was killed by\s+(.*?)\s*<\/color>/i;

/**
 * Parses a message with Unity rich text, detects events,
 * and converts it into a React node for rendering.
 *
 * @param message The raw message string from the server.
 * @returns An object containing the parsed content.
 */
export const parseAndRenderMessage = (message: string): ParsedMessage => {
    const eventMatch = message.match(eventRegex);
    // Try to match a death message
    const deathMatch = message.match(deathRegex);

    // Handle Join/Leave events specifically
    if (eventMatch) {
        const username = eventMatch[1];
        const eventType = eventMatch[2]?.toLowerCase();
        const actionText = eventType === 'joined!' ? 'joined the game.' : 'left the game.';

        return {
            isSystemEvent: true,
            renderedContent: (
                <span className="italic text-gray-500">
                    <span className="font-semibold">{username}</span> {actionText}
                </span>
            ),
        };
    }

    // Handle Death events specifically
    if (deathMatch) {
        const victim = deathMatch[1];
        const killer = deathMatch[2];

        return {
            isSystemEvent: true,
            renderedContent: (
                <span className="text-red-500 font-medium">
                    💀 <span className="font-bold">{victim}</span> was eliminated by <span className="font-bold">{killer}</span>.
                </span>
            ),
        };
    }

    // Handle standard rich text messages
    // This converts supported Unity tags to sanitized HTML.
    const sanitizedHtml = message
        .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>') // Bold
        .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')       // Italic
        .replace(
            /<color=(#?[\w]+)>(.*?)<\/color>/gi,
            '<span style="color:$1">$2</span>' // Color
        )
        .replace(/<(?!\/?(strong|em|span)(?=>|\s.*>))\/?.*?>/gi, ''); // Strip unsupported tags

    return {
        isSystemEvent: false,
        renderedContent: <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />,
    };
};