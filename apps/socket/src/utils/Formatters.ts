export function formatUptime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
export function convertSecondsToUnits(seconds: number) {
    const timeUnits = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
    ];
    let durationString = '';
    let remainingSeconds = seconds;
    timeUnits.forEach(({ unit, seconds }) => {
        const value = Math.floor(remainingSeconds / seconds);
        remainingSeconds %= seconds;
        if (value > 0) {
            durationString += `${value} ${unit}${value !== 1 ? 's' : ''} `;
        }
    });
    return durationString.trim();
}


export const cleanChatMessage = (message: string): string => {
    return message.replace(/^[^: ]+: /, '');
}