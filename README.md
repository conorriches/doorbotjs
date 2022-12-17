# DoorbotJS - a simple and modular open source access control system


## Features
### Inputs
* Keypad (4x3 matrix)
* Wiegand device - such as a fob reader (13.56mhz/125khz)
* Three user inputs
  * Doorbell
  * Request to Exit
  * Auxiliary

### Outputs
* Relay 1 - e.g. a door release relay
* Relay 2 - e.g. a secondary door relay or entry lights
* Status lights and LCD display

For detailed information [read the wiring diagram](./docs/wiring.md).

### Detailed Logging
An audit log is maintained. To find what you need, open `logs/info/` and find the file sorted by day.

A typical log item looks like this:
> 2022-11-19T21:28:55.229Z [START]: Device was started

To find what you need, search by the action or time:
- `[START]` - for when the service starts
- `[VALIDATE]` - to see what input was given
- `[ENTRY]` - for when someone entered
- `[DOORBELL]` - for when the doorbell was pressed
- `[REX]` - for when someone pressed the request to exit button

### Transparent error reporting
When errors happen, they are logged.
The status LEDs indicate when an error has occurred so that action can be taken.

Read the [manual](docs/manual.md) for further information.

## More reading
* Check out the [terminology](docs/terminology.md) for the terms used in the code and docs
* [A wiring diagram](./docs/wiring.md) is provided
*  A brief introduction to the [code](./docs/code.md) is given
*  The [manual](docs/manual.md) covers the main things for users