from flask import Flask, render_template, send_from_directory, abort, request
from flask_socketio import SocketIO, join_room, leave_room, emit, disconnect
import bcrypt
import logging
import os
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_fallback_key_for_dev')
socketio = SocketIO(app)

# From this:
socketio = SocketIO(app)

# To this (which allows all origins):
socketio = SocketIO(app, cors_allowed_origins="*")

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# { 'room_name': { 'hash': b'hashed_code', 'host_sid': 'session_id' } }
active_sessions = {}

# --- Standard Flask Routes ---

@app.route("/")
def home():
    """Serves the main landing page."""
    return render_template("index.html")

@app.route("/send/<channel>")
def send_session(channel):
    """Serves the SENDER's page for a given channel."""
    return render_template("send.html", channel=channel)

@app.route("/receive/<channel>")
def receive_session(channel):
    """Serves the RECEIVER's page for a given channel."""
    return render_template("receive.html", channel=channel)

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory('static', filename)

@app.errorhandler(404)
def not_found(e):
    return render_template("notfound.html"), 404

# --- Socket.IO Event Handlers (Hardened) ---

def get_channel_from_data(data):
    """Safely extracts and normalizes the channel name."""
    if not isinstance(data, dict):
        return None
    channel = data.get('channel')
    if not channel:
        return None
    return str(channel).strip().lower()

@socketio.on('host_session')
def handle_host_session(data):
    """
    Sender is hosting a new session.
    """
    host_sid = request.sid
    channel = get_channel_from_data(data)
    code = data.get('code', '').encode('utf-8')

    if not channel or not code:
        print(f"Host {host_sid} sent invalid host_session data.")
        return

    if channel in active_sessions:
        emit('host_error', {'message': 'This channel name is already in use.'}, room=host_sid)
        return

    hashed_code = bcrypt.hashpw(code, bcrypt.gensalt())
    
    active_sessions[channel] = {
        'hash': hashed_code,
        'host_sid': host_sid
    }
    join_room(channel)
    print(f"Host {host_sid} created room: {channel}")
    emit('host_success', room=host_sid)

@socketio.on('join_attempt')
def handle_join_attempt(data):
    """
    Receiver is attempting to join a room.
    """
    receiver_sid = request.sid
    channel = get_channel_from_data(data)
    code = data.get('code', '').encode('utf-8')

    if not channel or not code:
        print(f"Receiver {receiver_sid} sent invalid join_attempt data.")
        emit('auth_failed', {'message': 'Invalid request.'}, room=receiver_sid)
        return

    session = active_sessions.get(channel)

    if not session:
        emit('auth_failed', {'message': 'Session not found. It may have expired.'}, room=receiver_sid)
        return

    if bcrypt.checkpw(code, session['hash']):
        print(f"Receiver {receiver_sid} authenticated for room: {channel}")
        join_room(channel)
        emit('auth_success', room=receiver_sid)
        emit('new_receiver_joined', {'sid': receiver_sid}, room=session['host_sid'])
    else:
        print(f"Receiver {receiver_sid} failed auth for room: {channel}")
        emit('auth_failed', {'message': 'Incorrect 6-digit code.'}, room=receiver_sid)

@socketio.on('receiver_hello')
def handle_receiver_hello(data):
    """
    A *validated* receiver has sent their public key.
    """
    channel = get_channel_from_data(data)
    if not channel:
        print(f"Receiver {request.sid} sent invalid receiver_hello.")
        return
    
    session = active_sessions.get(channel)
    if not session or request.sid == session['host_sid']:
        return 

    print(f"Receiver {request.sid} sending public key to host")
    emit('server_announce_receiver', data, room=session['host_sid'])

@socketio.on('sender_offer')
def handle_sender_offer(data):
    target_sid = data.get('target_sid')
    if not target_sid:
        return
    print(f"Host relaying encrypted key to {target_sid}")
    emit('server_deliver_key', data, room=target_sid)

@socketio.on('update_text')
def handle_update_text(data):
    """
    Host updated text. Relay encrypted text.
    """
    channel = get_channel_from_data(data)
    if channel and channel in active_sessions:
        emit('text_updated', data, room=channel, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    """
    If host disconnects, close the session.
    """
    sid = request.sid
    channel_to_close = None
    for channel, data in active_sessions.items():
        if data['host_sid'] == sid:
            channel_to_close = channel
            break
    
    if channel_to_close:
        print(f"Host {sid} disconnected. Closing room: {channel_to_close}")
        if channel_to_close in active_sessions:
            del active_sessions[channel_to_close]
        emit('session_ended', {'message': 'Host has disconnected.'}, room=channel_to_close)
        socketio.close_room(channel_to_close)

if __name__ == "__main__":
    print("Starting Flask-SocketIO server...")
    socketio.run(app, debug=True, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)