#!/bin/bash

# Scoreboard Installer Script

# Colors
YELLOW="\033[1;33m"
RESET="\033[0m"

INSTALL_DIR="/var/www/flaskapp"
REPO_URL="https://github.com/PTomlinson1/scoreboard.git"
REPO_BRANCH="main"


echo -e "${YELLOW}🚀 Starting installation of the scoreboard system...${RESET}"

# Check for sudo/root
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}❌ Please run as root: sudo ./install_scoreboard.sh${RESET}"
  exit 1
fi

# Step 0: Ensure required system packages are installed
echo -e "${YELLOW}📦 Installing required system packages (git, python3, pip, venv)...${RESET}"
apt-get update
apt-get install -y git python3 python3-pip python3-venv apache2 libapache2-mod-wsgi-py3

# Step 1: Check if installation directory exists
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠️  Existing scoreboard installation found at $INSTALL_DIR${RESET}"
  echo -e "${YELLOW}Choose what to do:${RESET}"
  echo -e "${YELLOW}  [B] Backup and reinstall${RESET}"
  echo -e "${YELLOW}  [O] Overwrite existing installation${RESET}"
  echo -e "${YELLOW}  [Q] Quit and cancel installation${RESET}"
  read -p "$(echo -e ${YELLOW}Enter your choice [B/O/Q]: ${RESET})" user_choice

  case "$user_choice" in
      [Bb])
          timestamp=$(date +%Y%m%d_%H%M%S)
          backup_dir="${INSTALL_DIR}_backup_$timestamp"
          mv "$INSTALL_DIR" "$backup_dir"
          echo -e "${YELLOW}✅ Backed up existing install to $backup_dir${RESET}"
          ;;
      [Oo])
          rm -rf "$INSTALL_DIR"
          echo -e "${YELLOW}🧹 Removed existing install. Continuing...${RESET}"
          ;;
      *)
          echo -e "${YELLOW}❌ Installation cancelled.${RESET}"
          exit 1
          ;;
  esac
fi

# Step 2: Clone repository to temporary directory
echo -e "${YELLOW}📥 Cloning repository to temporary folder ($TEMP_DIR)...${RESET}"
# Set up temporary clone location using real user’s home
USER_HOME=$(eval echo "~$SUDO_USER")
TEMP_DIR="$USER_HOME/scoreboard_temp"
rm -rf "$TEMP_DIR"
git clone -b "$REPO_BRANCH" "$REPO_URL" "$TEMP_DIR"

# Step 3: Copy application files
echo -e "${YELLOW}📂 Copying Flask app files to $INSTALL_DIR...${RESET}"
mkdir -p "$INSTALL_DIR"
cp -r "$TEMP_DIR/flaskapp/"* "$INSTALL_DIR/"
# Also copy requirements.txt from the temp repo root
cp "$TEMP_DIR/requirements.txt" "$INSTALL_DIR/"


# Step 4: Set up Python virtual environment and install requirements
echo -e "${YELLOW}📦 Creating Python virtual environment...${RESET}"
cd "$INSTALL_DIR"
python3 -m venv venv
source venv/bin/activate

echo -e "${YELLOW}📥 Installing Python packages into venv...${RESET}"
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Step 5: Detect IP and ask user to confirm or override
DEFAULT_IP=$(hostname -I | awk '{print $1}')
read -p "$(echo -e ${YELLOW}📡 Enter the IP address of your Pi if not [${DEFAULT_IP}] : ${RESET})" PI_IP
PI_IP=${PI_IP:-$DEFAULT_IP}
echo -e "${YELLOW}✅ Using IP address: $PI_IP${RESET}"

# Step 6: Copy config templates and edit
CONFIG_TEMPLATE_DIR="$TEMP_DIR/config"
CONFIG_TEMPLATE_FILE="$CONFIG_TEMPLATE_DIR/config_template.py"
CONFIG_DEST_FILE="$INSTALL_DIR/config.py"
WSGI_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.wsgi"
CONF_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.conf"
WSGI_DEST="$INSTALL_DIR/flaskapp.wsgi"
CONF_DEST="/etc/apache2/sites-available/flaskapp.conf"

if [ ! -f "$CONFIG_DEST_FILE" ]; then
    echo -e "${YELLOW}📝 Setting up configuration...${RESET}"
    cp "$CONFIG_TEMPLATE_FILE" "$CONFIG_DEST_FILE"
    echo -e "${YELLOW}Opening config.py for editing...${RESET}"
    echo -e "${YELLOW}➡️  Instructions: Make your changes, then press CTRL+O to save, ENTER to confirm, and CTRL+X to exit.${RESET}"
    read -p "$(echo -e ${YELLOW}Press ENTER to continue...${RESET})"
    nano "$CONFIG_DEST_FILE"
fi

# Step 7: Set up WSGI and Apache config
echo -e "${YELLOW}🛠️  Setting up Apache and WSGI...${RESET}"
cp "$WSGI_TEMPLATE" "$WSGI_DEST"
sed "s|<PI-IP>|$PI_IP|g" "$CONF_TEMPLATE" > "$CONF_DEST"

# Step 8: Enable Apache site
a2ensite flaskapp.conf

# Step 9: Add www-data to dialout group
echo -e "${YELLOW}🔧 Adding www-data to dialout group...${RESET}"
usermod -a -G dialout www-data

# Step 9.5: Set ownership and permissions
echo -e "${YELLOW}🔐 Setting permissions and ownership on $INSTALL_DIR...${RESET}"
chown -R www-data:www-data "$INSTALL_DIR"
find "$INSTALL_DIR" -type d -exec chmod 755 {} \;
find "$INSTALL_DIR" -type f -exec chmod 644 {} \;


# Step 10: Make install/update scripts available system-wide
echo -e "${YELLOW}🔗 Making installer/updater scripts globally accessible...${RESET}"
cp "$TEMP_DIR/scripts/install_scoreboard.sh" /usr/local/bin/scoreboard-install
cp "$TEMP_DIR/scripts/update_scoreboard.sh" /usr/local/bin/scoreboard-update
chmod +x /usr/local/bin/scoreboard-install
chmod +x /usr/local/bin/scoreboard-update

# Step 11: Restart Apache
echo -e "${YELLOW}🔄 Restarting Apache...${RESET}"
systemctl restart apache2

# Step 12: Cleanup temp folder
echo -e "${YELLOW}🧹 Cleaning up temporary files...${RESET}"
rm -rf "$TEMP_DIR"

# Done!
echo -e "${YELLOW}✅ Installation complete!${RESET}"
echo -e "${YELLOW}➡️  Visit http://$PI_IP/manual to access the manual scoreboard.${RESET}"

