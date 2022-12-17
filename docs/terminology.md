# Terminology

## Entry code
An entry code is some user input from outside that authenticates them. 

It can be one of two things:
* fob code
  * This is a hex string scanned on a fob reader outside (A-F,0-9)
  * It is 8 or more characters
  * Only validated if 8 charcters or more
  * Only the first 8 characters are considered
* key code
  * This is numeric from a keypad outside (0-9)
  * It can be any length, including 0
  * Only validated if 8 characters or more

## Member list
The member list is a csv of members, found at `members.csv`

The CSV may have two or three columns:
* entry code - this is the entry code, a key code or fob code
* announce name - string for announcing internally someone has entered
* member id (optional) - the ID of the member according to the member system.

## Fail Safe
A fail safe lock requires power to lock the door and releases the doors when the power fails. An example is a magnetic lock.

## Fail secure
A fail secure lock requires power to release, and the doors will remain locked in a power failure. An example is an gate lock.


## Request to Exit
This is a software managed button, and activates the relays when used. 

This is typically a large button on the secure side of the doors that can be used to release the doors.

Note - this must have a physical override so that even if the system fails, users can still egress freely:
- For a fail secure system, there should be a physical means of releasing the door
- For a fail safe system, there should be a call point to physically disconnect the locks.