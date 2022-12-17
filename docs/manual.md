# User Manual
Congratulations on your installation of DoorbotJS 5000. We hope you will be very pleased with your new system. 

Please note no guarantee is given nor liability accepted. The license information can be found in `package.json`.

## Status Lights
There are thee LED indicators that provide an overview of the system status:
- Error LED (red)
- Run LED (green)
- Power LED (green)

### Normal operation
In normal operation you should see the following:
| LED | Status |
| --- | --- |
| Error | Extinguished |
| Run | Flashing at 1Hz |
| Power | Steady Illuminated |

The Run LED demonstrates that the code is running.


### System has encountered an error
Errors can occur in any system. While reliable, this system aims to be transparent when errors occur and warn passers by so that maintenance can be performed if necessary.

| LED | Status |
| --- | --- |
| Error | Flashing multiple times every other second |
| Run | Flashing at 1Hz  |
| Power | Steady Illuminated |

In this state, the system has encountered an issue and while it may still operate in a satisfactory manner, the cause should be investigated.

### System has crashed
| LED | Status |
| --- | --- |
| Error | Steady - Extinguished or Flashing |
| Run | Steady - Extinguished or Illuminated |
| Power | Steady Illuminated |

### System is encountering errors and restarting continuously
When the [main access process](./code.md) crashes, it's automatically restarted. This will interrupt the regular flashing of the Run LED. 

You may notice the LED flashes regularly, then stops, then goes back to flashing regularly.

| LED | Status |
| --- | --- |
| Error | Extinguished or Flashing |
| Run | Erratic flashing,  |
| Power | Steady Illuminated |

### Power failure
This could occur in a few situations:
- There is no 12v input
- The 12v to 5v converter has failed
- There is a loose connection or unplugged cable
- The Raspberry Pi power converter has failed
  - This is soldered to the Raspberry Pi and cannot easily be replaced.
  - This converts 5v to 3.3v 


| LED | Status |
| --- | --- |
| Error | Extinguished  |
| Run | Extinguished |
| Power | Extinguished|

## LCD Display
Where fitted, the LCD display will provide further information on the status of the system.

In normal operation, the display backlight is extinguished.

These are the events that will cause the LCD display to illuminate and display information.

### User has entered the building
When an access method such as the Wiegand reader has been used and user authenticated, the screen will display a short greeting.

### User has pressed the Request To Exit button
When a user requests to exit, the screen will display a goodbye message

### Errors have been recorded
When the log file has content, the LCD display will show that errors have been recorded

### The member list is too old
When the member list is stale, this will be reported as an error on the LCD display.
