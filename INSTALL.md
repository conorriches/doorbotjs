# Install / Fresh Deployment Guide

Steps to get DoorbotJS running on a fresh Raspberry Pi OS (Bookworm or later)
install, plus the gotchas hit the last time this was done from scratch.

## 1. OS setup

```
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y nodejs npm
```

## 2. Enable I2C (needed for the LCD)

`dtparam=i2c_arm=on` is commented out by default on every fresh Raspberry Pi
OS image - it's not something Bookworm disabled, it's just never been turned
on yet. Without it, `/dev/i2c-1` doesn't exist and the LCD can never connect.

```
sudo raspi-config   # Interface Options -> I2C -> enable
```

or manually uncomment the line in `/boot/firmware/config.txt`:

```
dtparam=i2c_arm=on
```

**This requires a reboot to take effect.** After rebooting, confirm the bus
exists and (optionally) scan it for the display:

```
ls /dev/i2c-1
sudo apt-get install -y i2c-tools
sudo i2cdetect -y 1        # look for 0x27 (or whatever your LCD backpack uses)
```

If the scan comes back completely empty, that's a wiring problem, not a
software one - check the LCD's SDA/SCL/power/GND connections to the header's
I2C pins (GPIO2/GPIO3 + 5V + GND) before debugging any further.

## 3. Clone and install

```
git clone https://github.com/conorriches/doorbotjs.git
cd doorbotjs
npm i
```

## 4. Configure

`config/` is gitignored (it holds secrets), so it doesn't come with the
clone except for the example file. Create the real config from it:

```
cp config/default.example.json config/default.json
```

Then fill in `config/default.json` with the real `telegram.apikey`,
`telegram.chatid`, `members.querykey`, `members.apikey`, and `screens`/
`domain` values.

## 5. Create the `temp/` directory

`temp/` is gitignored and **does not get created automatically**. The
member-list job writes to `temp/members.csv` without ever creating the
directory first, so without this step `updatememberlist.js` (and therefore
`access.js` in production, via PM2) crashes immediately with:

```
Error: ENOENT: no such file or directory, open 'temp/members.csv'
```

Fix:

```
mkdir -p temp
```

## 6. GPIO pin numbering (Bookworm-specific)

On Raspberry Pi OS Bookworm (kernel 6.6+), extra GPIO chips get registered
before the SoC's own, so the SoC chip shows up as `gpiochip512` instead of
the old `gpiochip0`. Since `onoff` addresses pins by their global
`/sys/class/gpio` number, every BCM pin number needs that base added.

`access.js` already accounts for this via the `GPIO_CHIP_BASE` constant near
the top of the pin definitions. It should not need touching on a standard
Pi 4/400 running Bookworm, but if you're on different hardware or a future
OS release, verify the base first:

```
ls /sys/class/gpio/                       # look for gpiochipNNN
cat /sys/class/gpio/gpiochipNNN/label     # should read "pinctrl-bcm2711" (or similar) for the SoC chip
```

and update `GPIO_CHIP_BASE` in `access.js` to match `NNN` if it's different
from `512`.

## 7. Run under PM2

```
sudo npm install -g pm2
cd doorbotjs
pm2 start ecosystem.config.cjs
sudo env PATH=$PATH:/usr/bin $(pm2 -v >/dev/null 2>&1; which pm2 || echo /usr/local/lib/node_modules/pm2/bin/pm2) startup systemd -u pi --hp /home/pi
pm2 save
```

(`pm2 startup` prints the exact `sudo env ...` command to run for your
system - copy/paste that one rather than assuming the path above.)

Verify everything is actually running and boot-persistent:

```
pm2 list
curl http://localhost:3000/status
sudo reboot   # then re-check `pm2 list` / the status endpoint once it's back
```

`overall.status` in the `/status` response should read `"ok"`.

## Troubleshooting

**`UnhandledPromiseRejection`, reason `undefined`, crashing immediately on
startup** - this used to happen whenever the LCD couldn't connect (wrong/
disabled I2C bus, wrong address, nothing wired up), because
`Lcd.checkConnected()` rejected with no argument and no caller had a
`.catch()`. Fixed in `src/lcd.js` - LCD failures now degrade gracefully
instead of taking down the whole access process. If you see this again on a
fresh checkout, you're on a version without that fix.

**`Device or resource busy` when exporting a GPIO pin** - a previous crashed
run left pins exported without cleaning them up. Clear them manually before
restarting:

```
for p in <pin numbers your config uses, e.g. 516 517 519 520 521 529 535 536 537 539>; do
  echo $p | sudo tee /sys/class/gpio/unexport
done
```

**`i2cdetect` shows nothing at all on the bus** - the display isn't
electrically connected. Check wiring before assuming a software/address
problem.

**`ENOENT: temp/members.csv`** - see step 5, `temp/` wasn't created.
