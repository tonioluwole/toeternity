import logging
from datetime import datetime
from flask import request
from waitress import serve
from app import app

HOST = '0.0.0.0'
PORT = 1222

# 1. Suppress Waitress's default background clutter
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger('waitress')
logger.setLevel(logging.ERROR) # Only show critical server crashes

# 2. Add a hook to Flask to log all incoming HTTP traffic
@app.after_request
def log_request_info(response):
    timestamp = datetime.now().strftime('%Y-%b-%d %H:%M:%S')
    ip = request.remote_addr
    method = request.method
    
    # Clean up the path (removes trailing '?' if there are no parameters)
    path = request.path
    status = response.status_code
    
    # Print the log directly to your CMD window
    print(f"[{timestamp}] {ip} - \"{method} {path}\" {status}")
    return response

if __name__ == "__main__":
    # 3. Print a clean startup dashboard so you know it's working
    print("=" * 60)
    print("🎮 ETERNITY GAME SERVER")
    print(f"[*] Status        : ONLINE")
    print(f"[*] Engine        : Waitress (Production WSGI)")
    print(f"[*] Local Address : http://localhost:{PORT}")
    print(f"[*] Public Port   : {PORT}")
    print("=" * 60)
    print("[*] Network traffic logs will stream below:\n")
    
    # 4. Start the server
    serve(app, host=HOST, port=PORT)