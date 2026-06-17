// Server-side chat room membership authorization (task 6.1).
// Determines which users may join a chat room and who may post, derived from
// the chat type and the deal's parties. The gateway authorizes every join and
// every emit against these pure functions; the client is never trusted.
// (Requirements 30.2, 30.4)
/**
 * Resolve the authorized participants of a chat. The middleman observes the
 * buyer<->seller chat (so they can moderate and see deleted messages) but is a
 * full participant in the *_mm chats and the handover chat.
 */
export function chatParticipants(chatType, deal) {
    const out = [];
    const add = (userId, role, observer) => {
        if (userId)
            out.push({ userId, role, observer });
    };
    switch (chatType) {
        case 'buyer_seller':
            add(deal.buyerId, 'buyer', false);
            add(deal.sellerId, 'seller', false);
            add(deal.middlemanId, 'middleman', true);
            break;
        case 'buyer_mm':
            add(deal.buyerId, 'buyer', false);
            add(deal.middlemanId, 'middleman', false);
            break;
        case 'seller_mm':
            add(deal.sellerId, 'seller', false);
            add(deal.middlemanId, 'middleman', false);
            break;
        case 'handover_mm':
            add(deal.buyerId, 'buyer', false);
            add(deal.middlemanId, 'middleman', false);
            break;
    }
    return out;
}
/** The deal role of a user, or null if they are not a party to the deal. */
export function roleOf(userId, deal) {
    if (userId === deal.middlemanId)
        return 'middleman';
    if (userId === deal.buyerId)
        return 'buyer';
    if (userId === deal.sellerId)
        return 'seller';
    return null;
}
/** True if the user may join (read) the chat room. */
export function canJoinChatRoom(userId, chatType, deal) {
    return chatParticipants(chatType, deal).some((p) => p.userId === userId);
}
/** True if the user may post messages (observers may not). */
export function canPostMessage(userId, chatType, deal) {
    const participant = chatParticipants(chatType, deal).find((p) => p.userId === userId);
    return participant !== undefined && !participant.observer;
}
/** True if the user is the deal's middleman. */
export function isMiddleman(userId, deal) {
    return deal.middlemanId !== null && userId === deal.middlemanId;
}
//# sourceMappingURL=membership.js.map