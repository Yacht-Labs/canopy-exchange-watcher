# canopy-exchange-watcher

## Deploy Development Environment 

Install mongo with brew:
1. `xcode-select --install`
2. `brew tap mongodb/brew`
3. `brew install mongodb-community@5.0`

To run MongoDB (i.e. the mongod process) as a macOS service, run:

`brew services start mongodb-community@5.0`

If you started MongoDB as a macOS service:

`brew services list`

You can also view the log file to see the current status of your mongod process:
`/usr/local/var/log/mongodb/mongo.log.` 

To begin using MongoDB, connect mongosh to the running instance. From a new terminal, issue the following:
`mongosh`

Copy `.env_local` to `.env` file

Run `npm run build`

Run `node run checkSchema`

#### Environment Variables

- `DATABASE_URL` = url for your mongodb instance
- `ORIGIN_PROVIDER` = url to connect to your provider for the origin chain
- `DESTINATION_PROVIDER` = url to connect to your provider for the destination chain
- `DESTINATION_PRIVATE_KEY` = Account private key to send mint transactions to the minter contract
- `DESTINATION_PUBLIC_KEY` = Corresponding public key
- `VAULT_CONTRACT_ADDRESS` = Address for the vault contract on the origin chain
- `MINT_CONTRACT_ADDRESS` = Address for the mint contract on the destination chain
- `ORIGIN_CHAIN_BLOCK_HEIGHT` = Blockheight that the vault contract was deployed at
- `CHUNK_SIZE` = How many blocks to increment by after searching through events in the last chunk
- `GAS` = The amount of gas your vault contract will use to mint;
- `GAS_PRICE` = Variable gas price;
- `DESTINATION_CHAIN_ID` = Chain ID for your destination;

## Architecture Overview

![Architecture Overview](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/CanopyExchangeArchitectureOverview.png)

The canopy exchange bridge system allows a user to transfer a token from an origin blockchain to a destination blockchain. It acheives this by locking the token in a vault contract on the origin chain and then minting an equal amount of synthetic token on the destination chain. The synthetic token has a one-to-one backing of the original token on the origin chain.

A bridge service is responsible for watching the origin chain for deposit events and then sending the appropriate mint transactions to the destination chain. 

## Bridge Service 

The canopy exchange bridge service is comprised of three ts-node sub-services: the watcher, the minter, and the mint-confirmer. These services are connected to one mongo database for state persistence.  All three services utilize an event loop pattern.

### The Watcher

![Watcher Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/watcherDiagram.png)

The watcher loop starts by retrieving the ChainStatus document that contains the current watcherBlockHeight. This value is manually initialized when deploying the bridge service. It should be initialized to the block height of the transaction that deploys the vault contract. 

THe watcher then queries the vault contract for all Deposit events in the range defined as the difference between the current watcherBlockHeight and the CHUNK_SIZE constant. If there are no existing DepositEvents with the specified transaction hash, the event is saved in the database as a DepositEvent document with status NEW.

Once this iteration of the loop completes without creating any new DepositEvents, the current watcherBlockHeight is incremented by CHUNK_SIZE. This ensures that all DepositEvents in the current block range of the loop were successfully saved to the database.

### The Minter

![Minter Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/minterDiagram.png)

The minter loop starts by finding a DepositEvent in the databse with a status of NEW. It then checks to make sure there is a corresponding DepositEvent with that transaction hash on the origin chain. If the transaction no longer exists, possibly due to a chain reorg, we mark the DepositEvent as DEPOSIT_FAILED.

Once it has confirmed the deposit, the minter then checks if there are any Mint events on the destination chain with a txHash value equal to the transaction hash of the DepositEvent to prevent a double mint.

In the case that this is a new event to be minted, it will send a signed transaction to the mintWithEvent method on the destination chain's contract that specifies the: account, amount, and transaction hash (of the DepositEvent) to be minted. It then updates that DepositEvent to MINTING status.

In the edge case that it does find a matching Mint event for the NEW DepositEvent, it means the transaction was minted but the status didn't get updated in the database. In that case we update the DepositEvent as MINTED and the bridge operation is complete for that DepositEvent. 

### The Mint Confirmer

![Mint Confirmer Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/mintConfirmerDiagram.png)

The mint confirmer loop starts by taking a DepositEvent with status MINTING. It then checks if there is a Mint event on the destination chain with a transaction hash matching the DepositEvent. If it finds the target Mint event, it updates the DepositEvent as status MINTED and the bridging operation is complete. 

If it doesn't find a matching Mint event for the current DepositEvent, it retries three times. If it fails to find a match after three attempts, it updates the DepositEvent to MINT_FAILED so the funds can either be withdrawn on the origin chain by the user, or the mint can be retried. 
