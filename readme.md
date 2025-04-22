# 🏏 Cricket Scoreboard System

A modern, real-time scoreboard system for cricket clubs — designed to be easy to install, easy to update, and compatible with both physical scoreboards and web-based displays.

Based on the original Build Your Own Scoreboard concept here: https://buildyourownscoreboard.wordpress.com/
Many thanks to them for the original set up and build instructions.

Built for Raspberry Pi, with support for:
- Manual or PCS (Play-Cricket Scorer) integration
- Serial-driven physical displays
- Web dashboard for manual updates
- Firebase integration for online viewers

---

## 🔧 Features

### Core Display Features
- Real-time cricket scoreboard display in browser
- Manual and PCS (Play-Cricket Scorer) modes
- Configurable display for innings:
  - First innings: Total, Overs, Wickets, Current Run Rate
  - Second innings: Target, To Win, Required Rate
- Batter and Bowler panels with:
  - Names, Scores, Balls
  - Highlight for striker and current bowler
- This Over tracker and Runs Required section
- Clock, logos, and match metadata

### Physical Scoreboard Integration
- Serial output to Arduino/M5Atom-based scoreboards
- Configurable field order and digit widths
- ACK matching and auto-retry for reliable updates
- Custom shutdown signal on Raspberry Pi shutdown
- Logging of all sent and received serial data

### Manual Mode Controls
- Fully responsive mobile-friendly update page
- Zeroing logic with SweetAlert wizards
- Editable batter names, scores, overs, target
- Match Setup Wizard (team names, overs, show batters)
- End of Innings and End of Match prompts

### Firebase Viewer Integration
- Optional Firestore publishing for online viewers
- All fields updated as JSON document
- View engagement tracking via ping stats
- Viewer report with graphs per innings

### Configurable Architecture
- All paths, serial settings, Firestore options in `config.py`
- Separate Firebase and Serial manager threads
- Can be run headless on Raspberry Pi
- Support for different scoreboard hardware via config

---

# 🚀 Installation (Raspberry Pi)

## 📋 First Steps - Get Pi Ready for Install

1. Recommend starting with a clean install of Pi OS 12 Lite 32bit on an SD card, installed with Raspberry Pi Imager tool
2. During install using the Raspberry Pi Imager Tool, set the following options:
   - Hostname: scoreboard
   - Enable SSH
   - set your required locale
   - if WiFi is needed, enter the details for your network. If running wired, then diable wifi.
3. Put your SD card in the Pi and start it, then connect with an SSH terminal (you'll have to find the IP address)
3. Fix your Raspberry Pi's IP address in your router to ensure it doesn't change (instructions not in the scope of this document)
4. Turn off built-in Bluetooth on the Pi if not needed. This improves serial port stability.
   - From a terminal, run
   - ```bash
     sudo nano /boot/firmware/config.txt
     ```
     Add at the end
     ```bash
     # disable built in bluetooth
     dtoverlay=disable-bt
     ```
     Then reboot
     ```bash
     sudo reboot
     ```
5. Disable the Serial Console on the Pi in order to enable serial communication with the scoreboard.
   - From a terminal, run raspi-config:
   - ```bash
     sudo raspi-config
     ```
   - Go to 3-Interface Options, then I6-Serial Port and choose:
       - Would you like a login shell to be accessible over serial? NO
       - Would you like the serial port hardware to be enabled? YES
   - Then choose finish - the Pi should reboot to apply the changes. 
7. Install the Flask app first before setting up the ESP32 device, bacuse you will need the Pi IP address to configure the ESP32.

---

## 🚀 Install the Scoreboard App

From a terminal on your Pi:

```bash
cd ~
wget https://github.com/PTomlinson1/scoreboard/raw/main/scripts/install_scoreboard.sh
chmod +x install_scoreboard.sh
sudo ./install_scoreboard.sh
```

After installation, open a browser and go to:

```
http://<YOUR-PI-IP-ADDRESS>/manual
```

---

# 🚀 Install the ESP32

In the `esp32 firmware` folder follow the instructions in `esp32 firmware/README.md`

---

## 🔄 Updating the Scoreboard App

Once installed, you can update any time by running:

```bash
update_scoreboard
```

This will pull the latest version from GitHub and restart Apache.

---

## 📎 Notes

- The installer **adds `www-data` to the `dialout` group** for serial access.
- Apache is configured to serve the Flask app from `/var/www/flaskapp`.
- Scripts `install_scoreboard` and `update_scoreboard` are installed to `/usr/local/bin` and accessible globally via terminal.

---

## ⚙️ Configuration

All settings are in `config.py` in the installed directory.
The installation script will prompt you to edit the config.
Everything can be left as default for initial setup, except the fields that your scoreboard is expecting.
Detailed notes are in the comments in the `config.py` file.

---

## 🧪 Development Notes

- WSGI server runs Flask app under Apache
- `serial_manager.py` and `firebase_manager.py` run in background threads
- Use `logger.debug/info/warning` to trace runtime behavior
- Logs stored in `scoreboard.log` (with rotation)

---

## 📄 License

MIT License — free to use, modify, and distribute. Credit appreciated!

---

## 💬 Contact & Support

Maintained by Patrick Tomlinson - Collingbourne Cricket Club

If you have any questions or issues, please raise an issue in Github.
