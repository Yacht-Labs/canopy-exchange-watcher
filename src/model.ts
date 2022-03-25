import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ChainStatusSchema = new Schema();
ChainStatusSchema.add({
  watcherBlockHeight: Number,
  minterBlockHeight: Number,
  mintedBlockHeight: Number,
});

const BlockchainEventSchema = new Schema();
BlockchainEventSchema.add({
  address: String,
  blockHash: String,
  blockNumber: Number,
  logIndex: Number,
  removed: Boolean,
  transactionHash: String,
  transactionIndex: Number,
  id: String,
  from: String,
  amount: String,
  event: String,
  signature: String,
});

const DepositEventSchema = new Schema();
DepositEventSchema.add({
  transactionHash: String,
  status: {
    type: String,
    enum: ["NEW", "MINTING", "MINTED", "FAILED"],
  },
  event: BlockchainEventSchema,
});

export const ChainStatus = mongoose.model("ChainStatus", ChainStatusSchema);
export const DepositEvent = mongoose.model("DepositEvent", DepositEventSchema);
export const BlockchainEvent = mongoose.model(
  "BlockchainEvent",
  BlockchainEventSchema
);
