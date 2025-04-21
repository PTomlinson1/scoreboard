# 🏏 Cricket Scoreboard System

A modern, real-time scoreboard system for cricket clubs — designed to be easy to install, easy to update, and compatible with both physical scoreboards and web-based displays.

Built for Raspberry Pi, with support for:
- Manual or PCS (Play-Cricket Scorer) integration
- Serial-driven physical displays
- Web dashboard for manual updates
- Firebase integration for online viewers

---

## 📸 Preview

> _(Add screenshots here if desired, or link to a live demo)_

---

## 🔧 Features

<details>
<summary>Click to view full feature list</summary>

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

</details>

---

## 🚀 Installation (Raspberry Pi)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cricket-scoreboard.git
cd cricket-scoreboard
```

### 2. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Apache + WSGI Setup

Copy the `flaskapp.conf` file to Apache:

```bash
sudo cp flaskapp.conf /etc/apache2/sites-available/
sudo a2ensite flaskapp.conf
sudo systemctl restart apache2
```

Make sure `www-data` has serial access:

```bash
sudo usermod -aG dialout www-data
```

---

## ⚙️ Configuration

All settings are in `config.py`:

```python
# Serial output config
SERIAL_OUTPUT_FORMAT = {
    "fields": ["total", "overs", "wkts"],
    "widths": {"total": 3, "overs": 2, "wkts": 1},
    "pad": "-",  # character used to pad digits
    "prefix": "4,",
    "suffix": "#",
    "shutdown_command": "4,aaa,aa,a#",
    "ack_enabled": True,
}
```

Also includes:
- File paths for data and logs
- Firebase toggle and credentials
- Serial port and baud rate

---

## 🧪 Development Notes

- WSGI server runs Flask app under Apache
- `serial_manager.py` and `firebase_manager.py` run in background threads
- Use `logger.debug/info/warning` to trace runtime behavior
- Logs stored in `scoreboard.log` (with rotation)

---

## 🧑‍💻 For Contributors

Coming soon:
- Automatic installation script
- Live device updater
- Support for team logos + match info

---

## 📄 License

MIT License — free to use, modify, and distribute. Credit appreciated!

---

## 💬 Contact & Support

Maintained by **[Your Club / GitHub Username]**

> If your club is interested in using this system, raise an Issue or contact via GitHub.