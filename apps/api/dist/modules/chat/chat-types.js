// Shared chat domain types and the realtime event vocabulary (Group 6).
// Pure type/enum declarations consumed by the gateway, services, and tests.
// (Requirements 27, 28, 30)
/** Server -> client realtime events. */
export const SERVER_EVENTS = {
    messageNew: 'message:new',
    messageEdited: 'message:edited',
    messageDeleted: 'message:deleted',
    reactionUpdated: 'reaction:updated',
    typing: 'typing',
    readAck: 'read:ack',
    presence: 'presence',
    slaTick: 'sla:tick',
    notification: 'notification',
    chatClosed: 'chat:closed',
    chatReopened: 'chat:reopened',
    dealUpdate: 'deal:update',
};
/** Client -> server realtime events. */
export const CLIENT_EVENTS = {
    sendMessage: 'message:send',
    editMessage: 'message:edit',
    deleteMessage: 'message:delete',
    react: 'message:react',
    startTyping: 'typing:start',
    stopTyping: 'typing:stop',
    markRead: 'read:mark',
    joinChat: 'chat:join',
};
/** Stable room-name builders used for Socket.IO room membership. */
export function dealRoom(dealId) {
    return `deal:${dealId}`;
}
export function chatRoom(chatId) {
    return `chat:${chatId}`;
}
export function userRoom(userId) {
    return `user:${userId}`;
}
//# sourceMappingURL=chat-types.js.map