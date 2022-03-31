# canopy-exchange-watcher

## Deploy Development Environment 

Install mongo with brew:
`xcode-select --install`
`brew tap mongodb/brew`
`brew install mongodb-community@5.0`

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

Run `node dist/src/checkSchema.js`

## Architecture Overview

![Architecture Overview](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/CanopyExchangeArchitectureOverview.png)

The canopy exchange bridge system allows a user to transfer a token from an origin blockchain to destination blockchain. It acheives this by locking the token in a vault contract on the origin chain and then minting an equal amount of synthetic token on the destination chain. The synthetic token has a one-to-one backing of the original token on the origin chain.

A bridge service is responsible for watching the origin chain for deposit events and then sending the appropriate mint transactions to the destination chain when a deposit occurs. 

### Bridge Service 

The canopy exchange bridge service is comprised of three ts-node sub-services: the watcher, the minter, and the mint confirmer. These services are connected to one mongo database for state persistence.  All three services utilize an event loop pattern.

##### The Watcher

![Watcher Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/watcherDiagram.png)

The watcher loop starts by retrieving the ChainStatus document that contains the current watcherBlockHeight. This value is manually initialized when deploying the bridge service. It should be initialized to the block height of the transaction that deploys the vault contract. 

Then the web3 getPastEvents method queries vault contract for all Deposit events 

##### The Minter

![Minter Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/minterDiagram.png)

##### The Mint Confirmer

![Mint Confirmer Diagram](https://github.com/jeevanmaathur/canopy-exchange-watcher/blob/main/media/mintConfirmerDiagram.png)
