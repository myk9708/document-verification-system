import os
import uuid
import random
import hashlib
import json
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

SECRET_KEY = "dev-secret-change-me"
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
CERT_FOLDER = os.path.join(os.path.dirname(__file__), "certs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CERT_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
DOC_TYPE_LABELS = {
    "birth_certificate": "Birth Certificate",
    "academic_transcript": "Academic Transcript",
    "id_document": "ID Document",
    "experience_certificate": "Experience Certificate",
}

# ---------------------------------------------------------------------------
# In-memory storage
# ---------------------------------------------------------------------------
users = {}          # email -> {email, password_hash, name, role, created_at}
documents = {}       # doc_id -> {...}
notifications = {}   # email -> [ {id, message, created_at, is_read} ]

# ---------------------------------------------------------------------------
# Simple blockchain
# ---------------------------------------------------------------------------
class Blockchain:
    def __init__(self):
        self.chain = []
        self._add_block({"genesis": True}, previous_hash="0")

    def _hash_block(self, index, timestamp, data, previous_hash):
        block_string = json.dumps(
            {"index": index, "timestamp": timestamp, "data": data, "previous_hash": previous_hash},
            sort_keys=True, default=str
        )
        return hashlib.sha256(block_string.encode()).hexdigest()

    def _add_block(self, data, previous_hash=None):
        index = len(self.chain)
        timestamp = datetime.utcnow().isoformat()
        prev_hash = previous_hash if previous_hash is not None else self.chain[-1]["hash"]
        block_hash = self._hash_block(index, timestamp, data, prev_hash)
        block = {
            "index": index,
            "timestamp": timestamp,
            "data": data,
            "previous_hash": prev_hash,
            "hash": block_hash,
        }
        self.chain.append(block)
        return block

    def add_document_block(self, data):
        return self._add_block(data)

    def is_valid(self):
        for i in range(1, len(self.chain)):
            current, prev = self.chain[i], self.chain[i - 1]
            if current["previous_hash"] != prev["hash"]:
                return False
            recomputed = self._hash_block(current["index"], current["timestamp"], current["data"], current["previous_hash"])
            if recomputed != current["hash"]:
                return False
        return True

    def find_by_hash(self, hash_value):
        for block in self.chain:
            if block["hash"] == hash_value:
                return block
        return None


blockchain = Blockchain()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def make_token(user):
    payload = {
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def require_auth(roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            user = users.get(payload["email"])
            if not user:
                return jsonify({"error": "User not found"}), 401

            g.current_user = user

            if roles and user["role"] not in roles:
                return jsonify({"error": "Access denied for this role"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def add_notification(email, message):
    notifications.setdefault(email, []).append({
        "id": str(uuid.uuid4()),
        "message": message,
        "created_at": datetime.utcnow().isoformat(),
        "is_read": False,
    })


def run_ai_analysis(document_type, filename):
    """Simulated AI analysis (no external API required)."""
    steps = [
        {"step": "format_validation", "weight": 15},
        {"step": "text_extraction", "weight": 25},
        {"step": "pattern_recognition", "weight": 35},
        {"step": "fraud_detection", "weight": 25},
    ]
    analysis_steps = []
    total = 0.0
    for s in steps:
        confidence = random.randint(72, 100)
        total += confidence * (s["weight"] / 100)
        detail_map = {
            "format_validation": f"File format is valid for {document_type}",
            "text_extraction": "Key fields extracted via OCR simulation",
            "pattern_recognition": "Document layout matches known templates",
            "fraud_detection": "No signs of digital manipulation detected",
        }
        analysis_steps.append({
            "step": s["step"],
            "confidence": confidence,
            "status": "passed" if confidence >= 75 else "flagged",
            "details": detail_map[s["step"]],
        })

    score = round(total)

    if score >= 95:
        authenticity, recommendation, status = "authentic", "Highly authentic - Immediate approval recommended", "pending_authority"
    elif score >= 90:
        authenticity, recommendation, status = "authentic", "Very likely authentic - Approval recommended", "pending_authority"
    elif score >= 85:
        authenticity, recommendation, status = "authentic", "Likely authentic - Recommend approval with minor review", "pending_authority"
    elif score >= 75:
        authenticity, recommendation, status = "uncertain", "Uncertain authenticity - Manual review required", "needs_review"
    else:
        authenticity, recommendation, status = "suspicious", "Suspicious - Rejection or investigation recommended", "needs_review"

    return {
        "confidence_score": score,
        "authenticity": authenticity,
        "recommendation": recommendation,
        "engine": "simulated-analyzer-v1",
        "reasoning": f"Automated analysis of '{filename}' completed across {len(steps)} checks.",
        "analysis_steps": analysis_steps,
    }, status


def public_doc_summary(doc):
    return {
        "id": doc["id"],
        "name": doc["name"],
        "type": doc["type"],
        "status": doc["status"],
        "uploadDate": doc["upload_date"][:10],
        "blockchainHash": doc["blockchain_hash"],
        "aiScore": doc["ai_analysis"]["confidence_score"] if doc.get("ai_analysis") else None,
        "issuedBy": doc.get("issued_by"),
    }


def doc_details(doc):
    return {
        "id": doc["id"],
        "name": doc["name"],
        "type": doc["type"],
        "status": doc["status"],
        "upload_date": doc["upload_date"],
        "file_size": doc.get("file_size", 0),
        "blockchain_hash": doc["blockchain_hash"],
        "ai_analysis": doc.get("ai_analysis"),
        "authority_action": doc.get("authority_action"),
        "has_image": bool(doc.get("file_path")),
        "issued_by": doc.get("issued_by"),
    }


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    role = data.get("role", "individual")

    if not email or not password or not name:
        return jsonify({"error": "Email, password and name are required"}), 400
    if role not in ("individual", "issuing_authority", "verifying_authority"):
        return jsonify({"error": "Invalid role"}), 400
    if email in users:
        return jsonify({"error": "User already exists"}), 400

    users[email] = {
        "email": email,
        "password_hash": generate_password_hash(password),
        "name": name,
        "role": role,
        "created_at": datetime.utcnow().isoformat(),
    }
    notifications.setdefault(email, [])

    user = users[email]
    token = make_token(user)
    return jsonify({
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "user": {"email": user["email"], "name": user["name"], "role": user["role"]},
    })


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email = data.get("email")
    password = data.get("password")

    user = users.get(email)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid password"}), 401

    token = make_token(user)
    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {"email": user["email"], "name": user["name"], "role": user["role"]},
    })


# ---------------------------------------------------------------------------
# Document endpoints (individual)
# ---------------------------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
@require_auth(roles=["individual"])
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    document_type = request.form.get("document_type")

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not document_type:
        return jsonify({"error": "Document type required"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    user = g.current_user
    doc_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    stored_name = f"{doc_id}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, stored_name)
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    ai_analysis, status = run_ai_analysis(document_type, filename)

    block = blockchain.add_document_block({
        "document_id": doc_id,
        "document_type": document_type,
        "user_email": user["email"],
        "status": status,
    })

    documents[doc_id] = {
        "id": doc_id,
        "name": filename,
        "type": document_type,
        "file_path": file_path,
        "file_size": file_size,
        "user_email": user["email"],
        "upload_date": datetime.utcnow().isoformat(),
        "status": status,
        "ai_analysis": ai_analysis,
        "blockchain_hash": block["hash"],
        "authority_action": None,
    }

    return jsonify({
        "success": True,
        "document_id": doc_id,
        "blockchain_hash": block["hash"],
        "ai_analysis": {
            "confidence_score": ai_analysis["confidence_score"],
            "authenticity": ai_analysis["authenticity"],
            "recommendation": ai_analysis["recommendation"],
        },
        "status": status,
    })


@app.route("/api/documents", methods=["GET"])
@require_auth()
def get_documents():
    user = g.current_user
    my_docs = [d for d in documents.values() if d["user_email"] == user["email"]]
    my_docs.sort(key=lambda d: d["upload_date"], reverse=True)
    return jsonify([public_doc_summary(d) for d in my_docs])


@app.route("/api/document/<doc_id>/details", methods=["GET"])
@require_auth()
def get_document_details(doc_id):
    doc = documents.get(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify(doc_details(doc))


@app.route("/api/document/<doc_id>/image", methods=["GET"])
@require_auth()
def get_document_image(doc_id):
    doc = documents.get(doc_id)
    if not doc or not doc.get("file_path") or not os.path.exists(doc["file_path"]):
        return jsonify({"error": "Image not found"}), 404
    return send_file(doc["file_path"])


@app.route("/api/document/<doc_id>/download-certificate", methods=["GET"])
@require_auth()
def download_certificate(doc_id):
    doc = documents.get(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if doc["status"] != "verified":
        return jsonify({"error": "Only verified documents have a downloadable certificate"}), 400

    cert_path = os.path.join(CERT_FOLDER, f"{doc_id}.pdf")
    c = canvas.Canvas(cert_path, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 1.5 * inch, "Certificate of Verification")

    c.setFont("Helvetica", 12)
    lines = [
        f"Document: {doc['name']}",
        f"Type: {DOC_TYPE_LABELS.get(doc['type'], doc['type'])}",
        f"Owner: {doc['user_email']}",
        f"Issued by: {doc.get('issued_by', 'Verifying Authority')}",
        f"Status: {doc['status'].upper()}",
        f"Blockchain Hash: {doc['blockchain_hash']}",
        f"Date: {doc['upload_date'][:10]}",
    ]
    y = height - 2.5 * inch
    for line in lines:
        c.drawString(1.2 * inch, y, line)
        y -= 0.4 * inch

    c.showPage()
    c.save()

    return send_file(cert_path, as_attachment=True, download_name=f"certificate_{doc['name']}.pdf")


# ---------------------------------------------------------------------------
# Verifying authority endpoints
# ---------------------------------------------------------------------------
@app.route("/api/pending-documents", methods=["GET"])
@require_auth(roles=["verifying_authority"])
def pending_documents():
    pending = [d for d in documents.values() if d["status"] in ("pending_authority", "needs_review")]
    pending.sort(key=lambda d: d["upload_date"])
    result = []
    for d in pending:
        ai = d.get("ai_analysis", {})
        result.append({
            "id": d["id"],
            "name": f"{d['name']} - {d['user_email'].split('@')[0]}",
            "type": d["type"],
            "submittedBy": d["user_email"],
            "submissionDate": d["upload_date"][:10],
            "aiScore": ai.get("confidence_score"),
            "aiEngine": ai.get("engine"),
            "recommendation": ai.get("recommendation"),
            "blockchainHash": d["blockchain_hash"],
        })
    return jsonify(result)


@app.route("/api/authority-action", methods=["POST"])
@require_auth(roles=["verifying_authority"])
def authority_action():
    data = request.get_json(force=True) or {}
    doc_id = data.get("document_id")
    action = data.get("action")
    comments = data.get("comments", "")

    doc = documents.get(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if action not in ("approve", "reject"):
        return jsonify({"error": "Invalid action"}), 400

    user = g.current_user
    new_status = "verified" if action == "approve" else "rejected"
    doc["status"] = new_status
    doc["authority_action"] = {
        "action": action,
        "authority": user["email"],
        "authority_name": user["name"],
        "timestamp": datetime.utcnow().isoformat(),
        "comments": comments,
    }

    block = blockchain.add_document_block({
        "document_id": doc_id,
        "document_type": doc["type"],
        "user_email": doc["user_email"],
        "status": new_status,
    })
    doc["blockchain_hash"] = block["hash"]

    add_notification(
        doc["user_email"],
        f"Your document '{doc['name']}' was {new_status} by {user['name']}."
        + (f" Comment: {comments}" if comments else "")
    )

    return jsonify({"success": True, "document_id": doc_id, "new_status": new_status})


@app.route("/api/verify-hash", methods=["POST"])
@require_auth()
def verify_hash():
    data = request.get_json(force=True) or {}
    hash_value = data.get("hash", "")

    for doc in documents.values():
        if doc["blockchain_hash"] == hash_value:
            ai = doc.get("ai_analysis") or {}
            return jsonify({
                "valid": True,
                "document": {
                    "type": doc["type"],
                    "name": doc["name"],
                    "owner": doc["user_email"],
                    "issue_date": doc["upload_date"][:10],
                    "status": doc["status"],
                    "ai_score": ai.get("confidence_score"),
                }
            })
    return jsonify({"valid": False, "message": "Document not found in blockchain"})


@app.route("/api/blockchain/chain", methods=["GET"])
@require_auth()
def get_chain():
    return jsonify({"chain": blockchain.chain, "is_valid": blockchain.is_valid()})


@app.route("/api/blockchain/info", methods=["GET"])
def blockchain_info():
    return jsonify({
        "total_blocks": len(blockchain.chain),
        "latest_block_hash": blockchain.chain[-1]["hash"],
        "chain_valid": blockchain.is_valid(),
    })


# ---------------------------------------------------------------------------
# Issuing authority endpoints
# ---------------------------------------------------------------------------
@app.route("/api/individuals", methods=["GET"])
@require_auth(roles=["issuing_authority"])
def list_individuals():
    result = [{"email": u["email"], "name": u["name"]} for u in users.values() if u["role"] == "individual"]
    return jsonify(result)


@app.route("/api/issue-certificate", methods=["POST"])
@require_auth(roles=["issuing_authority"])
def issue_certificate():
    data = request.get_json(force=True) or {}
    recipient_email = data.get("recipient_email")
    document_type = data.get("document_type")
    cert_data = data.get("certificate_data", {})

    if not recipient_email or not document_type:
        return jsonify({"error": "Recipient and document type are required"}), 400
    if recipient_email not in users:
        return jsonify({"error": "Recipient not found"}), 404

    issuer = g.current_user
    doc_id = str(uuid.uuid4())
    holder_name = cert_data.get("holder_name", "")
    name = f"{DOC_TYPE_LABELS.get(document_type, document_type)} - {holder_name}".strip(" -")

    block = blockchain.add_document_block({
        "document_id": doc_id,
        "document_type": document_type,
        "user_email": recipient_email,
        "status": "verified",
        "issued_by": issuer["email"],
    })

    documents[doc_id] = {
        "id": doc_id,
        "name": name or f"{DOC_TYPE_LABELS.get(document_type, document_type)}",
        "type": document_type,
        "file_path": None,
        "file_size": 0,
        "user_email": recipient_email,
        "upload_date": datetime.utcnow().isoformat(),
        "status": "verified",
        "ai_analysis": None,
        "blockchain_hash": block["hash"],
        "authority_action": {
            "action": "issued",
            "authority": issuer["email"],
            "authority_name": issuer["name"],
            "timestamp": datetime.utcnow().isoformat(),
            "comments": "",
        },
        "issued_by": issuer["name"],
        "certificate_data": cert_data,
    }

    add_notification(recipient_email, f"{issuer['name']} issued you a new certificate: {name}.")

    return jsonify({"success": True, "document_id": doc_id, "blockchain_hash": block["hash"]})


@app.route("/api/issued-certificates", methods=["GET"])
@require_auth(roles=["issuing_authority"])
def issued_certificates():
    issuer = g.current_user
    mine = [d for d in documents.values() if d.get("authority_action", {}) and d["authority_action"].get("authority") == issuer["email"] and d["authority_action"].get("action") == "issued"]
    mine.sort(key=lambda d: d["upload_date"], reverse=True)
    return jsonify([{
        "id": d["id"],
        "name": d["name"],
        "recipientEmail": d["user_email"],
        "issuedDate": d["upload_date"][:10],
        "blockchainHash": d["blockchain_hash"],
    } for d in mine])


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@app.route("/api/notifications", methods=["GET"])
@require_auth()
def get_notifications():
    user = g.current_user
    user_notifs = sorted(notifications.get(user["email"], []), key=lambda n: n["created_at"], reverse=True)
    unread = sum(1 for n in user_notifs if not n["is_read"])
    return jsonify({"notifications": user_notifs, "unread_count": unread})


@app.route("/api/notifications/read", methods=["POST"])
@require_auth()
def mark_notifications_read():
    user = g.current_user
    for n in notifications.get(user["email"], []):
        n["is_read"] = True
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def stats():
    all_docs = list(documents.values())
    scored = [d["ai_analysis"]["confidence_score"] for d in all_docs if d.get("ai_analysis")]
    return jsonify({
        "total_documents": len(all_docs),
        "verified_documents": sum(1 for d in all_docs if d["status"] == "verified"),
        "pending_documents": sum(1 for d in all_docs if d["status"] == "pending_authority"),
        "rejected_documents": sum(1 for d in all_docs if d["status"] == "rejected"),
        "needs_review_documents": sum(1 for d in all_docs if d["status"] == "needs_review"),
        "average_ai_score": round(sum(scored) / len(scored), 1) if scored else 0,
        "blockchain_blocks": len(blockchain.chain),
        "blockchain_valid": blockchain.is_valid(),
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "services": {"ai_analyzer": "active", "blockchain": "active", "file_storage": "active"},
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
