const { EventEmitter } = require("events");

// Survive Next.js hot-reloads — reuse the same instance across module re-evaluations
if (!global._freelancepayEventBus) {
  global._freelancepayEventBus = new EventEmitter();
  global._freelancepayEventBus.setMaxListeners(100);
}

const eventBus = global._freelancepayEventBus;

// Channel name: "notification:<walletAddress>"
function emitNotification(walletAddress, notification) {
  eventBus.emit(`notification:${walletAddress}`, notification);
}

module.exports = { eventBus, emitNotification };
