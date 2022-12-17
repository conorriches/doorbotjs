# Code
- The code is written in Javascript
- The code is run and kept running by `pm2`
- If the code crashes, it's restarted.


## Installation
- Clone the repo and navigate to the doorbotjs folder
- run `npm i`
- install pm2 globally `npm i pm2 -g`
- Run `pm2 start ecosystem.config.js`
  - This will read `ecosystem.config.js` and set up the two processes


## Architecture
The top level folder is for stuff needed to run, and the two processes.

Inside the src folder are the various facilities needed to run the system. They should be sorted by concern, so that the main files can be kept relatively clean.

## Processes
There are two processes that run.
* Access
  * This runs the system, reads inputs and controls outputs.
* UpdateMemberList
  * This gets the CSV of valid IDs, imports it, checks it, and places the validated file in `members.csv`
  * This is run as a cron task and runs every few minutes

  
## Config
The config folder has an example config file. Copy this to `default.json`. 

You can then have environment specific config files:
- `development` - when testing on your computer
- `production` - when it's running for real

These files cascade, so any common config belongs in `default.json`

## Logging
Most things are logged. There are two categories - info logs and error logs:
- info logs are a record of things going on, who entered, when, what was pressed.
- error logs are for when things go wrong. The red error LED will respond if `logs/error/access.log` has any content.

## Debugging
- `pm2 list` to view processes
- `pm2 logs` to view logs
- `pm2 flush` to flush logs
- `pm2 restart X`
  - Replace X with either process ID (0 or 1) or process name