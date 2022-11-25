# Doorbot, now in JS

### Inputs:
* Keypad
  * Col 1 - Col 3
  * Row 1 - Row 4
* RFID via Wiegand
  * D0
  * D1
  * Beep
  * LED
  * (12v, 0v)

### Outputs:
* Relay 1 - Door release relay
* Relay 2 - Door strike relay (for future use)
* RUN LED - flashes green to indicate the script is running
* ERROR LED - illuminates red when there's an error log file present 


### Use:
The system is designed to be run via `pm2` which uses `ecosystem.config.js`

When started this will run `access` and `updatememberlist`:
* `access` is the main script and is what runs the access system
* `updatememberlist` is run as a cron task, and will pull down valid members' entrycodes every few minutes.

### Logging:
An audit log is maintained. To find what you need, open `logs/info/` and find the file sorted by day.

A typical log item looks like this:
> 2022-11-19T21:28:55.229Z [START]: Hackscreen was started

To find what you need, search by the action or time:
- `[START]` - for when the service starts
- `[VALIDATE]` - to see what input was given
- `[ENTRY]` - for when someone entered
- `[DOORBELL]` - for when the doorbell was pressed
- `[REX]` - for when someone pressed the request to exit button