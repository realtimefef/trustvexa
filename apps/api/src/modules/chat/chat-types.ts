// Shared chat domain types and the realtime event vocabulary (Group 6).
// Pure type/enum declarations consumed by the gateway, services, and tests.
// (Requirements 27, 28, 30)

export type ChatType = 'buyer_seller' | 'buyer_mm' | 'seller_mm' | 'handover_mm';
export type ChatStatus = 'open' | 'closed' | 'deleted_by_admin';
export type DealRole = 'buyer' | 'seller' | 'middleman';

export interface DealParties {
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
}

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
} as const;

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
} as const;

export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];

/** Stable room-name builders used for Socket.IO room membership. */
export function dealRoom(dealId: string): string {
  return `deal:${dealId}`;
}
export function chatRoom(chatId: string): string {
  return `chat:${chatId}`;
}
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
