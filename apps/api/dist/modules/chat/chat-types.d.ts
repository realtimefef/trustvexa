export type ChatType = 'buyer_seller' | 'buyer_mm' | 'seller_mm' | 'handover_mm';
export type ChatStatus = 'open' | 'closed' | 'deleted_by_admin';
export type DealRole = 'buyer' | 'seller' | 'middleman';
export interface DealParties {
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
}
/** Server -> client realtime events. */
export declare const SERVER_EVENTS: {
    readonly messageNew: "message:new";
    readonly messageEdited: "message:edited";
    readonly messageDeleted: "message:deleted";
    readonly reactionUpdated: "reaction:updated";
    readonly typing: "typing";
    readonly readAck: "read:ack";
    readonly presence: "presence";
    readonly slaTick: "sla:tick";
    readonly notification: "notification";
    readonly chatClosed: "chat:closed";
    readonly chatReopened: "chat:reopened";
    readonly dealUpdate: "deal:update";
};
/** Client -> server realtime events. */
export declare const CLIENT_EVENTS: {
    readonly sendMessage: "message:send";
    readonly editMessage: "message:edit";
    readonly deleteMessage: "message:delete";
    readonly react: "message:react";
    readonly startTyping: "typing:start";
    readonly stopTyping: "typing:stop";
    readonly markRead: "read:mark";
    readonly joinChat: "chat:join";
};
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
/** Stable room-name builders used for Socket.IO room membership. */
export declare function dealRoom(dealId: string): string;
export declare function chatRoom(chatId: string): string;
export declare function userRoom(userId: string): string;
//# sourceMappingURL=chat-types.d.ts.map