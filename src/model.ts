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
  txHash: String,
  transactionIndex: Number,
  id: String,
  from: String,
  amount: String,
  event: String,
  signature: String,
});

const DepositEventSchema = new Schema();
DepositEventSchema.add({
  txHash: String,
  mintTxHash: String,
  failureReason: String,
  status: {
    type: String,
    enum: ["NEW", "MINTING", "MINTED", "DEPOSIT_FAILED", "MINT_FAILED"],
  },
  event: BlockchainEventSchema,
  mintConfirmRetries: Number
});

export const ChainStatus = mongoose.model("ChainStatus", ChainStatusSchema);
export const DepositEvent = mongoose.model("DepositEvent", DepositEventSchema);
export const BlockchainEvent = mongoose.model(
  "BlockchainEvent",
  BlockchainEventSchema
);
