# canopy-exchange-watcher

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