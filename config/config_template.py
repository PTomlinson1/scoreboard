# config.py

# General paths
LOG_FILE = "/var/www/flaskapp/scoreboard.log"
DATA_PCS_FILE = "/var/www/flaskapp/data_pcs.json"
DATA_MANUAL_FILE = "/var/www/flaskapp/data_manual.json"
PRIORITY_FILE = "/var/www/flaskapp/priority.json"
OPTIONS_FILE = "/var/www/flaskapp/options.json"
FIXTURE_FILE = "/var/www/flaskapp/fixtures.json"

# Firebase Settings
FIREBASE_ENABLED = False  # Toggle False / True to disable/enable Firebase
FIREBASE_CREDENTIAL_PATH = "/var/www/flaskapp/scoreboard-service-account.json"
FIREBASE_PROJECT_ID = "scoreboard-project"
FIREBASE_COLLECTION = "scoreboard-collection"

# Serial Communication
SERIAL_PORT = "/dev/ttyACM0"
SERIAL_BAUDRATE = 57600

# SERIAL OUTPUT FORMAT CONFIGURATION
# ----------------------------------
# This dictionary defines how data is sent to the Arduino scoreboard over serial.
# The message sent will follow this format:
#   PREFIX + [fields] + SUFFIX
# Where:
#   - PREFIX is a string prepended to the message (e.g. "4,")
#   - SUFFIX is appended at the end (e.g. "#")
#   - PAD_CHAR is used to left-pad numeric values to fixed width (e.g. '-' -> "---")
#   - FIELDS is an ordered list of dictionaries. Each dictionary specifies:
#       - name: name of the field from the data
#       - widths: number of digits (field is left-padded to this length)

# Configuration for serial output formatting
# This defines what fields are sent to the Arduino scoreboard, in what order,
# how wide each field should be, and how to pad them.
# - Fields are taken from the dictionary passed to serial_mgr.send_score(data_dict)
# - If a field is missing or blank, it will be padded with the pad character
# - If "target" is 0, it will be shown as dashes (e.g. "---")
#
#
# Example configuration of all fields
# SERIAL_OUTPUT_FORMAT = {
#    "fields": ["batsa", "total", "batsb", "wickets", "overs", "target"],  # Order of fields to send
#    "widths": {
#        "batsa": 3,
#        "total": 3,
#        "batsb": 3,
#        "wickets": 1,
#        "overs": 2,
#        "target": 3
#    },
#    "pad": "-",       # Pad character used for left-padding
#    "prefix": "4,",   # Start of serial message
#    "suffix": "#",    # End of serial message
#    "ack_enabled": True  # Whether to match ACKs against sent values
# }
#
#
# NOTE - this must match what your Arduino is expecting
#
# ack_enabled: True or False - determines if serial_manager will wait for the ACK from Arduino
#                              if no ACK received it will retry until it is received, or restart itself
#                              /serial_status endpoint reports serial status

# ACK handling requires the Arduino to be correctly configured to send back a correctly formatted ACK
# so default is to disable



SERIAL_OUTPUT_FORMAT = {
    "fields": ["total", "overs", "wickets"],  # Order of fields to send
    "widths": {
        "total": 3,
        "wickets": 1,
        "overs": 2,
    },

    "pad": "-",       # Pad character used for left-padding
    "prefix": "4,",   # Start of serial message
    "suffix": "#",    # End of serial message
    "ack_enabled": False  # Whether to match ACKs against sent values
}


# Debugging
DEBUG_MODE = True

# Viewer Stats Ping logging
VIEWER_PINGS_LOG_TEMPLATE = "/var/www/flaskapp/viewer_pings_{date}.jsonl"
VIEWER_SESSIONS_FILE_TEMPLATE = "/var/www/flaskapp/viewer_sessions_{date}.json"