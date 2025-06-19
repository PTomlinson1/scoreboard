# firebase_manager.py
print("### FIREBASE_MANAGER.PY IMPORTED")

import threading
import queue
import time
import json
import logging
import firebase_admin
from datetime import datetime
from firebase_admin import credentials, firestore

logger = logging.getLogger('scoreboard')

firebase_initialized = False

def init_firebase(credentials_path):
    global firebase_initialized
    if not firebase_initialized:

        try:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            logger.info("[Firestore] Firebase Admin initialized")
        except Exception as e:
            logger.error(f"[Firestore] Failed to initialize Firebase Admin: {e}")
            raise

def push_today_to_viewer_dates():
    global firebase_initialized
    if not firebase_initialized:
        logger.warning("[Firestore] Skipping push_today_to_viewer_dates – Firebase not initialized")
        return
    try:
        db = firestore.client()
        doc_ref = db.collection("scoreboard").document("viewer_dates")
        today_str = datetime.now().strftime("%Y-%m-%d")

        doc_ref.set({
            today_str: True
        }, merge=True)

        logger.info(f"[Firestore] Pushed today ({today_str}) to viewer_dates document")
    except Exception as e:
        logger.warning(f"[Firestore] Failed to update viewer_dates: {e}")

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
        self.last_sent_data = {}
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

    def _push_to_firestore(self, document_name, data):
        if not firebase_initialized:
            logger.warning(f"[Firestore] Skipping push to {document_name} – Firebase not initialized")
            return
        try:
            db = firestore.client()
            doc_ref = db.collection(self.collection).document(document_name)
    
            # NEW: Track last sent fields per document
            if document_name not in self.last_sent_data:
                self.last_sent_data[document_name] = {}

            doc_last = self.last_sent_data[document_name]

            # Compare with last sent data for this document
            changed_fields = {}
            for key, value in data.items():
                if doc_last.get(key) != value:
                    changed_fields[key] = value

            if not changed_fields:
                logger.debug(f"[Firestore] No changes detected for '{document_name}', skipping update")
                return

            doc_ref.set(changed_fields, merge=True)
            logger.info(f"[Firestore] Updated document '{document_name}' in collection '{self.collection}' via Admin SDK")
            logger.debug(f"[Firestore] Updated with data: {changed_fields}")

            # Update only this document's last_sent_data
            doc_last.update(changed_fields)

        except Exception as e:
            self.last_error = str(e)
            logger.warning(f"[Firestore] Failed to push document '{document_name}' via Admin SDK: {e}")

    def _run(self):
        while self.running:
            try:
                document_name, data_dict = self.queue.get(timeout=1)
                self._push_to_firestore(document_name, data_dict)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"[Firestore] Unexpected error in FirebasePublisher thread: {e}")


def delayed_push_viewer_date():
    time.sleep(2)
    try:
        push_today_to_viewer_dates()
    except Exception as e:
        logger.warning(f"[Firestore] Delayed viewer_dates update failed: {e}")

firebase_mgr = None  # initialized in server.py
