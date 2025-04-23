#!/bin/bash

# Scoreboard Installer Script

YELLOW="\033[1;33m"
RESET="\033[0m"

INSTALL_DIR="/var/www/flaskapp"
REPO_URL="https://github.com/PTomlinson1/scoreboard.git"
REPO_BRANCH="main"

echo -e "${YELLOW}🚀 Starting installation/update of the scoreboard system...${RESET}"

# Check for sudo/root
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}❌ Please run as root: sudo ./install_scoreboard.sh${RESET}"
  exit 1
fi

echo -e "${YELLOW}📦 Installing required system packages...${RESET}"
apt-get update
apt-get install -y git python3 python3-pip python3-venv apache2 libapache2-mod-wsgi-py3

# Step 1: Handle existing installation
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠️  Existing scoreboard installation found at $INSTALL_DIR${RESET}"
  echo -e "${YELLOW}Choose what to do:${RESET}"
  echo -e "${YELLOW}  [U] Backup and Update${RESET}"
  echo -e "${YELLOW}  [N] Backup and Fresh Install${RESET}"
  echo -e "${YELLOW}  [Q] Quit${RESET}"
  read -p "$(echo -e ${YELLOW}Enter choice [U/N/Q]: ${RESET})" user_choice

  timestamp=$(date +%Y%m%d_%H%M%S)
  backup_dir="${INSTALL_DIR}_backup_$timestamp"

  case "$user_choice" in
    [Uu])
      echo -e "${YELLOW}📦 Backing up current install to $backup_dir...${RESET}"
      cp -r "$INSTALL_DIR" "$backup_dir"

      USER_HOME=$(eval echo "~$SUDO_USER")
      TEMP_DIR="$USER_HOME/scoreboard_temp"
      rm -rf "$TEMP_DIR"
      git clone -b "$REPO_BRANCH" "$REPO_URL" "$TEMP_DIR"

      echo -e "${YELLOW}📂 Updating files (excluding config, logs, favicon)...${RESET}"
      rsync -av --exclude 'config.py' --exclude 'logs/' --exclude 'static/favicon/'         --exclude 'config_backup*' --exclude '*.log'         --exclude 'data_manual.json' --exclude 'data_pcs.json' --exclude 'priority.json'         "$TEMP_DIR/flaskapp/" "$INSTALL_DIR/"

      echo -e "${YELLOW}📄 Checking config template version...${RESET}"
      current_ver=$(grep CONFIG_TEMPLATE_VERSION "$INSTALL_DIR/config.py" | sed 's/.*"\(.*\)"/\1/')
      new_ver=$(grep CONFIG_TEMPLATE_VERSION "$TEMP_DIR/config/config_template.py" | sed 's/.*"\(.*\)"/\1/')

      if [ -z "$current_ver" ] || [ "$current_ver" != "$new_ver" ]; then
        echo -e "${YELLOW}⚠️  Config template changed or missing version.${RESET}"
        cp "$TEMP_DIR/config/config_template.py" "$INSTALL_DIR/config_template_new.py"
        echo -e "${YELLOW}📄 New template saved as config_template_new.py. Please review manually.${RESET}"
        echo -e "${YELLOW}🚫 Apache NOT restarted due to config mismatch.${RESET}"
        rm -rf "$TEMP_DIR"
        exit 0
      fi

      echo -e "${YELLOW}📥 Updating requirements.txt...${RESET}"
      cp "$TEMP_DIR/requirements.txt" "$INSTALL_DIR/"
      cd "$INSTALL_DIR"
      source venv/bin/activate
      pip install -r requirements.txt
      deactivate

      echo -e "${YELLOW}🔄 Restarting Apache...${RESET}"
      systemctl restart apache2

      echo -e "${YELLOW}🧹 Cleaning up...${RESET}"
      rm -rf "$TEMP_DIR"
      echo -e "${YELLOW}✅ Update complete.${RESET}"
      exit 0
      ;;
    [Nn])
      echo -e "${YELLOW}📦 Backing up and reinstalling...${RESET}"
      mv "$INSTALL_DIR" "$backup_dir"
      ;;
    *)
      echo -e "${YELLOW}❌ Cancelled.${RESET}"
      exit 1
      ;;
  esac
fi

# Fresh install path
USER_HOME=$(eval echo "~$SUDO_USER")
TEMP_DIR="$USER_HOME/scoreboard_temp"
rm -rf "$TEMP_DIR"
git clone -b "$REPO_BRANCH" "$REPO_URL" "$TEMP_DIR"

echo -e "${YELLOW}📂 Copying files...${RESET}"
mkdir -p "$INSTALL_DIR"
cp -r "$TEMP_DIR/flaskapp/"* "$INSTALL_DIR/"
cp "$TEMP_DIR/requirements.txt" "$INSTALL_DIR/"

cd "$INSTALL_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

DEFAULT_IP=$(hostname -I | awk '{print $1}')
read -p "$(echo -e ${YELLOW}📡 Enter Pi IP [${DEFAULT_IP}]: ${RESET})" PI_IP
PI_IP=${PI_IP:-$DEFAULT_IP}

CONFIG_TEMPLATE_DIR="$TEMP_DIR/config"
CONFIG_TEMPLATE_FILE="$CONFIG_TEMPLATE_DIR/config_template.py"
CONFIG_DEST_FILE="$INSTALL_DIR/config.py"
WSGI_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.wsgi"
CONF_TEMPLATE="$CONFIG_TEMPLATE_DIR/flaskapp.conf"
WSGI_DEST="$INSTALL_DIR/flaskapp.wsgi"
CONF_DEST="/etc/apache2/sites-available/flaskapp.conf"

if [ ! -f "$CONFIG_DEST_FILE" ]; then
  echo -e "${YELLOW}📝 Setting up config...${RESET}"
  cp "$CONFIG_TEMPLATE_FILE" "$CONFIG_DEST_FILE"
  read -p "$(echo -e ${YELLOW}Press ENTER to edit config...${RESET})"
  nano "$CONFIG_DEST_FILE"
fi

echo -e "${YELLOW}🛠️  Apache config...${RESET}"
cp "$WSGI_TEMPLATE" "$WSGI_DEST"
sed "s|<PI-IP>|$PI_IP|g" "$CONF_TEMPLATE" > "$CONF_DEST"
a2ensite flaskapp.conf

echo -e "${YELLOW}🔧 Adding www-data to dialout group...${RESET}"
usermod -a -G dialout www-data

echo -e "${YELLOW}🔐 Setting permissions...${RESET}"
chown -R www-data:www-data "$INSTALL_DIR"
find "$INSTALL_DIR" -type d -exec chmod 755 {} \;
find "$INSTALL_DIR" -type f -exec chmod 644 {} \;

echo -e "${YELLOW}🔗 Installing global script shortcut...${RESET}"
cp "$TEMP_DIR/scripts/install_scoreboard.sh" /usr/local/bin/install_scoreboard
chmod +x /usr/local/bin/install_scoreboard

echo -e "${YELLOW}🔒 Adding sudoers entries for www-data (shutdown/reboot)...${RESET}"
SUDOERS_FILE="/etc/sudoers.d/scoreboard_wwwdata"
echo "www-data ALL=NOPASSWD: /sbin/shutdown, /sbin/reboot" > "$SUDOERS_FILE"
chmod 440 "$SUDOERS_FILE"

echo -e "${YELLOW}🔄 Restarting Apache...${RESET}"
systemctl restart apache2

rm -rf "$TEMP_DIR"
echo -e "${YELLOW}✅ Installation complete. Visit http://$PI_IP/manual${RESET}"
