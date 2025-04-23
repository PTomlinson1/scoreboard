# serial_manager.py
print("### SERIAL_MANAGER IMPORTED")

import atexit
import time
import queue
import threading
import serial
import logging
import os
from config import SERIAL_PORT, SERIAL_BAUDRATE, SERIAL_OUTPUT_FORMAT

logger = logging.getLogger("scoreboard")

class SerialManager:
    def __init__(self, port, baudrate=57600):
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.running = True
        self.queue = queue.Queue()
        self.lock = threading.Lock()
        self.last_ack_msg = None
        self.last_sent_msg = None
        self.last_sent_values = None
        self.last_send_time = None
        self.waiting_for_ack = False
        self.ack_timeout_exceeded = False
        self.retry_timeout = 10
        self.retry_count = 0
        self.max_retries = 3
        self.last_retry_attempt = 0
        self.ack_enabled = SERIAL_OUTPUT_FORMAT.get("ack_enabled", False)
        logger.info(f"[Serial] ACK matching is {'enabled' if self.ack_enabled else 'disabled'}")
        self.output_format = SERIAL_OUTPUT_FORMAT
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()

    def _worker(self):
        while self.running:
            try:
                if self.ser is None or not self.ser.is_open:
                    self.ser = serial.Serial(self.port, self.baudrate, timeout=1)
                    logger.info(f"[Serial] Connected to {self.port}")

                now = time.time()

                while not self.queue.empty():
                    msg, value_map = self.queue.get()
                    self.ser.write((msg).encode('utf-8'))
                    self.last_sent_msg = msg.strip()
                    self.last_sent_values = value_map
                    self.last_send_time = now
                    self.waiting_for_ack = self.ack_enabled
                    self.retry_count = 0
                    self.last_retry_attempt = now
                    logger.debug(f"[Serial] Sent: {msg.strip()}")

                if self.ser.in_waiting > 0:
                    line = self.ser.readline().decode('utf-8').strip()
                    logger.debug(f"[Serial] Received: {line}")
                    if line.startswith("1,ACK:"):
                        self.last_ack_msg = line.strip()
                        self.last_send_time = now
                        self.ack_timeout_exceeded = False
                        logger.info(f"[Serial] ACK received: {line.strip()}")

                        # Match and clear waiting flag only if successful
                        if self._ack_matches_sent():
                            self.waiting_for_ack = False
                        else:
                            logger.warning("[Serial] Received ACK but values did not match")

                if self.ack_enabled and self.waiting_for_ack:
                    if (now - self.last_send_time > self.retry_timeout and 
                        now - self.last_retry_attempt > self.retry_timeout):
                        if not self._ack_matches_sent():
                            if self.retry_count < self.max_retries:
                                self.ser.write((self.last_sent_msg).encode('utf-8'))
                                self.last_retry_attempt = now
                                self.retry_count += 1
                                logger.warning(f"[Serial] Retry {self.retry_count}: {self.last_sent_msg}")
                            else:
                                logger.error("[Serial] Max retries reached. Resetting.")
                                self._reset_serial()
                                self.ack_timeout_exceeded = True
                                self.retry_count = 0

                time.sleep(0.1)
            except Exception as e:
                logger.warning(f"[Serial] Loop error: {e}")
                self._reset_serial()

    def _reset_serial(self):
        if self.ser:
            try:
                self.ser.close()
            except:
                pass
            self.ser = None

    def send_score(self, data_dict):
        serial_string, value_map = self.format_score_string(**data_dict)
        self.send(serial_string, value_map)


    def format_score_string(self, **data_dict):
        parts = []
        value_map = {}

        for name in self.output_format.get("fields", []):
            width = self.output_format.get("widths", {}).get(name, 1)
            pad = self.output_format.get("pad", "-")

            val = data_dict.get(name)

            # Special rule for 'target': show dashes if 0 or missing
            if name == "target" and (not val or str(val) == "0"):
                parts.append(pad * width)
                continue

            try:
                val_int = int(val)
                value_map[name] = val_int
                parts.append(str(val_int).rjust(width, pad))
            except:
                parts.append(pad * width)

        serial_string = self.output_format.get("prefix", "") + ",".join(parts) + self.output_format.get("suffix", "")
        return serial_string, value_map






    def send(self, serial_string, value_map):
        with self.lock:
            self.queue.put((serial_string, value_map))

    def _ack_matches_sent(self):
        if not self.last_ack_msg or not self.last_sent_values:
            logger.warning(f"[ACK Match] Missing ACK or sent values:\n  ack={self.last_ack_msg}\n  sent={self.last_sent_values}")
            return False
        try:
            ack_str = self.last_ack_msg.split("ACK:")[1].strip().strip("#")
            ack_parts = ack_str.split(",")
            ack_map = {}

            fields = self.output_format.get("fields", [])
            if len(ack_parts) != len(fields):
                logger.warning(f"[ACK Match] Field count mismatch: expected {len(fields)} fields, got {len(ack_parts)} in ACK")
                return False

            for i, key in enumerate(fields):
                val = int(ack_parts[i].replace("-", "") or "0")
                ack_map[key] = val

            logger.debug(f"[ACK Debug] Comparing sent={self.last_sent_values} vs ack={ack_map}")

            if ack_map == self.last_sent_values:
                logger.info(f"[ACK Match] ACK matched successfully: {ack_map}")
                return True
            else:
                logger.warning(f"[ACK Mismatch] Sent: {self.last_sent_values}, Received: {ack_map}")
                return False
                
        except Exception as e:
            logger.warning(f"[Serial] Error matching ACK: {e}")
            return False

    def stop(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join()


# Shutdown hook to send shutdown message if configured
def shutdown_hook():
    try:
        cmd = SERIAL_OUTPUT_FORMAT.get("shutdown_command")
        if cmd:
            with serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1) as ser:
                ser.write(cmd.encode())
                ser.flush()
                time.sleep(0.3)
    except Exception as e:
        logger.error(f"[Shutdown] Failed to send shutdown message: {e}")

atexit.register(shutdown_hook)

serial_mgr = None  # Initialized in server.py startup
