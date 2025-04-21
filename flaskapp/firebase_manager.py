# firebase_manager.py
print("### FIREBASE_MANAGER.PY IMPORTED")

import threading
import queue
import time
import json
import logging
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

logger = logging.getLogger('scoreboard')

class FirebasePublisher:
    def __init__(self, config):
        self.enabled = config.get("FIREBASE_ENABLED", False)
        self.credentials_path = config.get("FIREBASE_CREDENTIAL_PATH")
        self.project_id = config.get("FIREBASE_PROJECT_ID")
        self.collection = config.get("FIREBASE_COLLECTION", "scoreboard")
        self.queue = queue.Queue()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.running = False
        self.last_error = None
        self.start()
        

    def start(self):
        if not self.enabled:
            logger.info("[Firestore] Firebase publishing disabled in config")
            return
        self.running = True
        self.thread.start()
        logger.info("[Firestore] FirebasePublisher thread started")

    def stop(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=5)
        logger.info("[Firestore] FirebasePublisher thread stopped")

    def publish(self, document_name, data_dict):
        if not self.enabled:
            return
        self.queue.put((document_name, data_dict))

    def _get_access_token(self):
        credentials = service_account.Credentials.from_service_account_file(
            self.credentials_path,
            scopes=["https://www.googleapis.com/auth/datastore"]
        )
        credentials.refresh(Request())
        return credentials.token

    def _push_to_firestore(self, document_name, data):
        try:
            token = self._get_access_token()
            url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/{self.collection}/{document_name}"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            body = {"fields": {}}
            for key, value in data.items():
                if isinstance(value, bool):
                    body["fields"][key] = {"booleanValue": value}
                elif isinstance(value, int):
                    body["fields"][key] = {"integerValue": str(value)}
                elif isinstance(value, float):
                    body["fields"][key] = {"doubleValue": value}
                else:
                    body["fields"][key] = {"stringValue": str(value)}

            logger.debug(f"[Firestore] Payload to send to '{document_name}': {json.dumps(body, indent=2)}")

            response = requests.patch(url, headers=headers, json=body)
            response.raise_for_status()
            logger.info(f"[Firestore] Updated document '{document_name}' in collection '{self.collection}'")
        except Exception as e:
            self.last_error = str(e)
            logger.warning(f"[Firestore] Failed to push document '{document_name}': {e}")

    def _run(self):
        while self.running:
            try:
                document_name, data_dict = self.queue.get(timeout=1)
                self._push_to_firestore(document_name, data_dict)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"[Firestore] Unexpected error in FirebasePublisher thread: {e}")


firebase_mgr = None  # Will be initialized explicitly by server.py
