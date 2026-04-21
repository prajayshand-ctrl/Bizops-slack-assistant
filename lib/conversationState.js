const conversationStore = new Map();

const MAX_TURNS = 6;

export function getConversationState(channelId) {
  return (
    conversationStore.get(channelId) || {
      channelId,
      lastCategory: null,
      lastIssue: null,
      lastRecordLink: null,
      lastSuggestedAction: null,
      lastEscalationNeeded: false,
      turns: [],
      updatedAt: Date.now(),
    }
  );
}

export function updateConversationState(channelId, updates = {}) {
  const current = getConversationState(channelId);

  const next = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  if (updates.turn) {
    next.turns = [...current.turns, updates.turn].slice(-MAX_TURNS);
  }

  conversationStore.set(channelId, next);
  return next;
}

export function clearConversationState(channelId) {
  conversationStore.delete(channelId);
}

export function appendTurn(channelId, role, text) {
  return updateConversationState(channelId, {
    turn: {
      role,
      text,
      timestamp: Date.now(),
    },
  });
}