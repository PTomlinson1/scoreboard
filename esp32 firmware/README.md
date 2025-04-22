# ESP32 Firmware Upload Instructions

This folder contains the precompiled firmware binary for the M5Stack Atom S3 Lite used as a BLE-to-Wi-Fi bridge for the scoreboard project.

## Firmware File

- **Filename**: `scoreboard-bt-receiver.factory.bin`

## Uploading Firmware with ESPHome Web

To install this firmware onto your M5Stack Atom S3 Lite, follow these steps:

### 1. Open ESPHome Web

Go to: [https://web.esphome.io/](https://web.esphome.io/)

### 2. Connect Your ESP32

- Plug your M5Stack Atom S3 Lite into your computer via USB.
- Click **"Connect"** in ESPHome Web and choose the device from the list.
- Grant any browser permissions if requested.

### 3. Flash the Firmware

- After connecting, click **"Install"** and select **"Pick a file"**.
- Choose the provided `scoreboard-bt-receiver.factory.bin` file from this folder.
- Wait for the flashing process to complete and the device to reboot.

## 4. Wi-Fi Setup via Captive Portal

Once flashed and rebooted, the ESP32 will broadcast a captive portal to allow Wi-Fi setup:

1. On your computer or phone, connect to the new Wi-Fi network created by the ESP32 ("Scoreboard Setup WiFi", no password).
2. A captive portal will appear automatically. If not, open a browser and go to `http://192.168.4.1`.
3. Select your scoreboard Wi-Fi network and enter the password.
4. The ESP32 will connect and reboot.
5. Now go to your router settings and fix the ip address for the ESP32 device

## 5. Flask Server POST Endpoint Setup

- Ensure your Pi Flask app is running and accessible on the same network.
- Once rebooted, open a web browser and go to `http://<ESP32-IP-ADDRESS>`
- In the HTTP POST URL field, actions column, enter the update URL for data to be sent to the Pi. The format is `http://<PI-IP-ADDRESS>/update`
- **Important**: Your Raspberry Pi should also be set with a static IP address via your router.

## 6. Test Play Cricket Scorer

- Once the above setup is complete, open the PCS app, connect to the bluetooth scoreboard using:
     Match Settings -> External Scoreboard -> Choose Generic Manufacturer and tap on Device
	 Select "scoreboard-bt-receiver" in the list of bluetooth devices.
- Start a demo match to send data to the scoreboard and monitor activity from the ESP32's web page, and the Pi Scoreboard.log


