#!/bin/bash

# Scoreboard Installer Script

INSTALL_DIR="/var/www/flaskapp"
REPO_URL="https://github.com/PTomlinson1/scoreboard.git"
REPO_BRANCH="main"
CONFIG_TEMPLATE_DIR="$INSTALL_DIR/config"
CONFIG_TEMPLATE_FILE="$CONFIG_TEMPLATE_DIR/config_template.py"
CONFIG_DEST_FILE="$INSTALL_DIR/config.py"
WSGI_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.wsgi"
CONF_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.conf"
WSGI_DEST="$INSTALL_DIR/flaskapp.wsgi"
CONF_DEST="/etc/apache2/sites-available/flaskapp.conf"

echo "🚀 Starting installation of the scoreboard system..."

# Check for sudo/root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root: sudo ./install_scoreboard.sh"
  exit 1
fi

# Step 1: Check if installation directory exists
if [ -d "$INSTALL_DIR" ]; then
  echo "⚠️  Existing scoreboard installation found at $INSTALL_DIR"
  echo "Choose what to do:"
  echo "  [B] Backup and reinstall"
  echo "  [O] Overwrite existing installation"
  echo "  [Q] Quit and cancel installation"
  read -p "Enter your choice [B/O/Q]: " user_choice

  case "$user_choice" in
      [Bb])
          timestamp=$(date +%Y%m%d_%H%M%S)
          backup_dir="${INSTALL_DIR}_backup_$timestamp"
          mv "$INSTALL_DIR" "$backup_dir"
          echo "✅ Backed up existing install to $backup_dir"
          ;;
      [Oo])
          rm -rf "$INSTALL_DIR"
          echo "🧹 Removed existing install. Continuing..."
          ;;
      *)
          echo "❌ Installation cancelled."
          exit 1
          ;;
  esac
fi

# Step 2: Clone repository
echo "📥 Cloning repository..."
git clone -b "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"

# Step 3: Set up Python virtual environment and install requirements
echo "🐍 Installing python3-venv (if not already)..."
apt-get update && apt-get install -y python3-venv

echo "📦 Creating Python virtual environment..."
cd "$INSTALL_DIR"
python3 -m venv venv
source venv/bin/activate

echo "📥 Installing Python packages into venv..."
pip install -r requirements.txt
deactivate

# Step 4: Detect IP and ask user to confirm or override
DEFAULT_IP=$(hostname -I | awk '{print $1}')
read -p "📡 Enter the IP address of your Pi [${DEFAULT_IP}]: " PI_IP
PI_IP=${PI_IP:-$DEFAULT_IP}
echo "✅ Using IP address: $PI_IP"

# Step 5: Copy config template
if [ ! -f "$CONFIG_DEST_FILE" ]; then
    echo "📝 Setting up configuration..."
    cp "$CONFIG_TEMPLATE_FILE" "$CONFIG_DEST_FILE"
    echo "Opening config.py for editing..."
    echo "➡️  Instructions: Make your changes, then press CTRL+O to save, ENTER to confirm, and CTRL+X to exit."
    read -p "Press ENTER to continue..."
    nano "$CONFIG_DEST_FILE"
fi

# Step 6: Set up WSGI and Apache config
echo "🛠️  Setting up Apache and WSGI..."
cp "$WSGI_TEMPLATE" "$WSGI_DEST"
sed "s|<PI-IP>|$PI_IP|g" "$CONF_TEMPLATE" > "$CONF_DEST"

# Step 7: Enable Apache site
a2ensite flaskapp.conf

# Step 8: Add www-data to dialout group
echo "🔧 Adding www-data to dialout group..."
usermod -a -G dialout www-data

# Step 9: Make install/update scripts available system-wide
echo "🔗 Making installer/updater scripts globally accessible..."
cp "$INSTALL_DIR/scripts/install_scoreboard.sh" /usr/local/bin/scoreboard-install
cp "$INSTALL_DIR/scripts/update_scoreboard.sh" /usr/local/bin/scoreboard-update
chmod +x /usr/local/bin/scoreboard-install
chmod +x /usr/local/bin/scoreboard-update

# Step 10: Restart Apache
echo "🔄 Restarting Apache..."
systemctl restart apache2

echo "✅ Installation complete!"
echo "➡️  Visit http://$PI_IP/manual to access the manual scoreboard."
echo "ℹ️  Ensure your Pi has a static IP and Bluetooth is disabled using raspi-config."
