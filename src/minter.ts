import { web3Origin, web3Destination } from "./providers";
import { mintContract } from "./contracts";
import mongoose from "mongoose";
import "dotenv/config";
import { DepositEvent } from "./model/model";

const {
  DATABASE_URL,
  DESTINATION_PRIVATE_KEY,
  DESTINATION_PUBLIC_KEY,
  MINT_CONTRACT_ADDRESS,
  GAS,
  GAS_PRICE,
  CHAIN_ID,
} = process.env;

const gas = parseInt(GAS);
const gasPrice = parseInt(GAS_PRICE);
const chainId = parseInt(CHAIN_ID);

const minter = async () => {
  let minterLock = 0;
  async function lockMinter() {
    if (minterLock === 0) {
      minterLock = 1;
      return true;
    } else {
      return false;
    }
  }
  await mongoose.connect(DATABASE_URL);

  async function minterLoop() {
    const unlocked = await lockMinter();
    if (!unlocked) {
      console.log("locked");
      return;
    }

    const event = await DepositEvent.findOne({ status: "NEW" });
    if (!event) {
      console.log("no more events found!");
      minterLock = 0;
      return;
    }
    console.log("Found Deposit Event: " + event);
    // check if tx still exists on origin chain
    const tx = await web3Origin.eth.getTransaction(event.txHash);
    if (!tx) {
      console.error("Failed to find origin chain tx");
      event.status = "DEPOSIT_FAILED";
      event.failureReason = "Origin chain tx lookup failed when minting";
      await event.save();
      return;
    }
    // check for MintEvent on destination chain with DepositEvent.txHash
    console.log("Calling getPastEvents on contract for tx: ", event.txHash);
    const [mintEvent] = await mintContract.getPastEvents("Mint", {
      topics: [
        "0x4e3883c75cc9c752bb1db2e406a822e4a75067ae77ad9a0a4d179f2709b9e1f6",
        event.txHash,
      ],
    });
    if (!mintEvent) {
      console.log("Starting mint");

      const gasPrice = await web3Destination.eth.getGasPrice();
      const gasPriceFormatted = web3Destination.utils.fromWei(
        gasPrice,
        "ether"
      );
      mintContract.handleRevert = true;

      const gasAmount = await mintContract.methods
        .mintWithEvent(event.event.from, 50, 5000)
        .estimateGas({ gas: 5000000 });
      console.log("Gas amount estimate", gasAmount);

      const nonce = await web3Destination.eth.getTransactionCount(
        DESTINATION_PUBLIC_KEY
      );
      console.log("Nonce", nonce);

      const tx = {
        nonce: nonce,
        from: DESTINATION_PUBLIC_KEY,
        to: MINT_CONTRACT_ADDRESS,
        gas: gas,
        gasPrice: gasPrice,
        chainId: chainId,
        data: mintContract.methods
          .mintWithEvent(
            event.event.from,
            event.event.amount,
            BigInt(event.event.txHash)
          )
          .encodeABI(),
      };
      console.log("Mint Transaction Data: ", tx);
      const signedTx = await web3Destination.eth.accounts.signTransaction(
        tx,
        DESTINATION_PRIVATE_KEY,
        (err, res) => {
          console.error("Error signing mint transaction: ", err);
          console.log("Signed Mint Transaction: ", res);
        }
      );

      web3Destination.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on("error", (err) => {
          console.log("Error minting on destination chain: ", err);
        })
        .on("receipt", (receipt) => {
          console.log("Minted");
          console.log({ receipt });
          minterLock = 0;
          console.log("Minting event: " + event);
          event.mintTxHash = receipt.transactionHash;
          event.status = "MINTING";
          event.save();
        });

      console.log("Finished minting on destination chain");
    } else {
      console.log(
        "This mintEvent has already been minted on destination chain!"
      );
      event.mintTxHash = mintEvent.transactionHash;
      event.status = "MINTED";
      event.save();
      minterLock = 0;
    }
  }
  setInterval(minterLoop, 4000);
};
minter();
