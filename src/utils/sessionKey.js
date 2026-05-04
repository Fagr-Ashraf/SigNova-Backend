const mongoose = require("mongoose");

function participantKeyFromIds(userIdA, userIdB) {
  const a = userIdA instanceof mongoose.Types.ObjectId ? userIdA.toString() : String(userIdA);
  const b = userIdB instanceof mongoose.Types.ObjectId ? userIdB.toString() : String(userIdB);
  return [a, b].sort().join(":");
}

module.exports = { participantKeyFromIds };
