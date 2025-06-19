import sys
import os

os.environ['GRPC_DNS_RESOLVER'] = 'native'

sys.path.insert(0, "/var/www/flaskapp")

# Optional: print path info to help debug
print("### WSGI LOADING", file=sys.stderr)
print(sys.path, file=sys.stderr)

from server import app as application
