from flask import Flask, request, jsonify, send_from_directory
from datetime import date
import sqlite3
import os
import jwt
import hashlib

from database import get_conn, hash_password, init_db

app = Flask(__name__, static_folder=None)
SECRET = "omborxona_secret_2024"
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

init_db()

# ── helpers ───────────────────────────────────────────────────────────────────

def make_token(user_id, username, role, warehouse_id):
    return jwt.encode(
        {"id": user_id, "username": username, "role": role, "warehouse_id": warehouse_id},
        SECRET, algorithm="HS256"
    )

def auth(required_role=None):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None, (jsonify({"error": "Token yo'q"}), 401)
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        return None, (jsonify({"error": "Token yaroqsiz"}), 401)
    if required_role and payload["role"] != required_role:
        return None, (jsonify({"error": "Ruxsat yo'q"}), 403)
    return payload, None

def today():
    return date.today().isoformat()

def get_ready_quantity(conn, model, warehouse_id):
    """Tayyor mahsulotlar: production yozilgan - aktga olingan"""
    produced = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM production WHERE model=? AND warehouse_id=?",
        (model, warehouse_id)
    ).fetchone()["t"]
    acted = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM acts WHERE model=? AND warehouse_id=?",
        (model, warehouse_id)
    ).fetchone()["t"]
    return max(0, produced - acted)

# ── serve frontend ─────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/css/<path:filename>")
def css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)

@app.route("/js/<path:filename>")
def js_files(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)

# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.post("/api/register")
def register():
    data = request.json
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "Login va parol kiritish shart!"}), 400
    conn = get_conn()
    existing = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Bu login band, boshqa tanlang!"}), 400
    import time
    wid = "W" + str(int(time.time()))[-4:]
    conn.execute(
        "INSERT INTO users (username, password, role, warehouse_id) VALUES (?,?,?,?)",
        (username, hash_password(password), "admin", wid)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Muvaffaqiyatli ro'yxatdan o'tdingiz!"}), 201

@app.post("/api/login")
def login():
    data = request.json
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    conn = get_conn()
    user = conn.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (username, hash_password(password))
    ).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "Login yoki parol xato!"}), 401
    u = dict(user)
    token = make_token(u["id"], u["username"], u["role"], u["warehouse_id"])
    return jsonify({
        "token": token,
        "user": {"id": u["id"], "username": u["username"], "role": u["role"], "warehouse_id": u["warehouse_id"]}
    })

# ── WORKERS ───────────────────────────────────────────────────────────────────

@app.get("/api/workers")
def get_workers():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, username, role, warehouse_id FROM users WHERE role='worker' AND warehouse_id=?",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/workers")
def add_worker():
    user, err = auth("admin")
    if err: return err
    data = request.json
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "Login va parol kiritish shart!"}), 400
    conn = get_conn()
    existing = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Bu login band!"}), 400
    conn.execute(
        "INSERT INTO users (username, password, role, warehouse_id) VALUES (?,?,?,?)",
        (username, hash_password(password), "worker", user["warehouse_id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Ishchi qo'shildi!"}), 201

@app.put("/api/workers/<int:worker_id>/password")
def change_password(worker_id):
    user, err = auth("admin")
    if err: return err
    data = request.json
    new_pass = data.get("new_password") or ""
    if not new_pass:
        return jsonify({"error": "Yangi parol kiritish shart!"}), 400
    conn = get_conn()
    w = conn.execute(
        "SELECT id FROM users WHERE id=? AND warehouse_id=? AND role='worker'",
        (worker_id, user["warehouse_id"])
    ).fetchone()
    if not w:
        conn.close()
        return jsonify({"error": "Ishchi topilmadi!"}), 404
    conn.execute("UPDATE users SET password=? WHERE id=?", (hash_password(new_pass), worker_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Parol yangilandi!"})

# ── PRODUCTS / WAREHOUSE ──────────────────────────────────────────────────────

@app.get("/api/products")
def get_products():
    user, err = auth()
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM products WHERE warehouse_id=? ORDER BY model",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/products")
def add_product():
    user, err = auth("admin")
    if err: return err
    data = request.json
    model = (data.get("model") or "").strip()
    if not model:
        return jsonify({"error": "Model nomini kiriting!"}), 400
    conn = get_conn()
    existing = conn.execute(
        "SELECT id FROM products WHERE model=? AND warehouse_id=?",
        (model, user["warehouse_id"])
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Bu model allaqachon mavjud!"}), 400
    conn.execute(
        "INSERT INTO products (model, warehouse_id, current_quantity) VALUES (?,?,0)",
        (model, user["warehouse_id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Model qo'shildi!"}), 201

# ── TAYYOR MAHSULOTLAR ────────────────────────────────────────────────────────

@app.get("/api/ready-products")
def get_ready_products():
    """Barcha modellar uchun: tayyorlangan - aktga olingan = kutayotgan tayyor tovarlar (0 ta bo'lsa ham ko'rsatiladi)"""
    user, err = auth()
    if err: return err
    wid = user["warehouse_id"]
    conn = get_conn()

    # Barcha mahsulot modellarini olish (products jadvalidan)
    all_models_raw = conn.execute(
        "SELECT DISTINCT model FROM products WHERE warehouse_id=? ORDER BY model", (wid,)
    ).fetchall()

    # Production'dan ham bo'lgan modellarni qo'shish
    prod_models_raw = conn.execute(
        "SELECT DISTINCT model FROM production WHERE warehouse_id=?", (wid,)
    ).fetchall()

    all_models = set(r["model"] for r in all_models_raw) | set(r["model"] for r in prod_models_raw)

    result = []
    for model in sorted(all_models):
        ready = get_ready_quantity(conn, model, wid)
        result.append({"model": model, "ready_quantity": ready})

    conn.close()
    return jsonify(result)


# ── CLEAR DATA (Admin only) ───────────────────────────────────────────────────

@app.delete("/api/production/<int:record_id>")
def delete_production(record_id):
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM production WHERE id=? AND warehouse_id=?",
        (record_id, user["warehouse_id"])
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Yozuv topilmadi!"}), 404
    conn.execute("DELETE FROM production WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "O'chirildi!"})

@app.delete("/api/production/clear/all")
def clear_production():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    conn.execute("DELETE FROM production WHERE warehouse_id=?", (user["warehouse_id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Barcha ishlab chiqarish ma'lumotlari o'chirildi!"})

@app.delete("/api/acts/<int:record_id>")
def delete_act(record_id):
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM acts WHERE id=? AND warehouse_id=?",
        (record_id, user["warehouse_id"])
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Akt topilmadi!"}), 404
    # Skladdagi miqdorni qaytarish
    conn.execute(
        "UPDATE products SET current_quantity = MAX(0, current_quantity - ?) WHERE model=? AND warehouse_id=?",
        (row["quantity"], row["model"], user["warehouse_id"])
    )
    conn.execute("DELETE FROM acts WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Akt o'chirildi, sklad yangilandi!"})

@app.delete("/api/acts/clear/all")
def clear_acts():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    # Skladdagi barcha miqdorlarni 0 ga tushirish (aktlardan kelgan)
    conn.execute(
        "UPDATE products SET current_quantity = 0 WHERE warehouse_id=?",
        (user["warehouse_id"],)
    )
    conn.execute("DELETE FROM acts WHERE warehouse_id=?", (user["warehouse_id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Barcha aktlar o'chirildi!"})

@app.delete("/api/sales/<int:record_id>")
def delete_sale(record_id):
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM sales WHERE id=? AND warehouse_id=?",
        (record_id, user["warehouse_id"])
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Sotuv yozuvi topilmadi!"}), 404
    # Skladdagi miqdorni qaytarish
    conn.execute(
        "UPDATE products SET current_quantity = current_quantity + ? WHERE model=? AND warehouse_id=?",
        (row["quantity"], row["model"], user["warehouse_id"])
    )
    conn.execute("DELETE FROM sales WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Sotuv o'chirildi, sklad yangilandi!"})

@app.delete("/api/sales/clear/all")
def clear_sales():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    # Sotilgan mahsulotlarni skladdaga qaytarish
    sales = conn.execute(
        "SELECT model, SUM(quantity) as total FROM sales WHERE warehouse_id=? GROUP BY model",
        (user["warehouse_id"],)
    ).fetchall()
    for s in sales:
        conn.execute(
            "UPDATE products SET current_quantity = current_quantity + ? WHERE model=? AND warehouse_id=?",
            (s["total"], s["model"], user["warehouse_id"])
        )
    conn.execute("DELETE FROM sales WHERE warehouse_id=?", (user["warehouse_id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Barcha sotuv ma'lumotlari o'chirildi!"})

# ── PRODUCTION ────────────────────────────────────────────────────────────────

@app.get("/api/production")
def get_production():
    user, err = auth()
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM production WHERE warehouse_id=? ORDER BY id DESC",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/production")
def add_production():
    user, err = auth()
    if err: return err
    data = request.json
    model = (data.get("model") or "").strip()
    quantity = data.get("quantity")
    if not model or not quantity or int(quantity) < 1:
        return jsonify({"error": "Model va miqdorni to'g'ri kiriting!"}), 400
    conn = get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO products (model, warehouse_id, current_quantity) VALUES (?,?,0)",
        (model, user["warehouse_id"])
    )
    conn.execute(
        "INSERT INTO production (date, worker_id, worker_name, model, quantity, warehouse_id) VALUES (?,?,?,?,?,?)",
        (today(), user["id"], user["username"], model, int(quantity), user["warehouse_id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Muvaffaqiyatli qo'shildi!"}), 201

# ── ACTS ──────────────────────────────────────────────────────────────────────

@app.get("/api/acts")
def get_acts():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM acts WHERE warehouse_id=? ORDER BY id DESC",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/acts")
def create_act():
    user, err = auth("admin")
    if err: return err
    data = request.json
    model = (data.get("model") or "").strip()
    quantity = data.get("quantity")
    if not model or not quantity or int(quantity) < 1:
        return jsonify({"error": "Model va miqdorni kiriting!"}), 400

    qty = int(quantity)
    conn = get_conn()

    # TEKSHIRUV: tayyor mahsulotlar yetarlimi?
    ready = get_ready_quantity(conn, model, user["warehouse_id"])
    if qty > ready:
        conn.close()
        return jsonify({
            "error": f"Tayyor mahsulot yetarli emas! '{model}' dan faqat {ready} ta tayyor, siz {qty} ta kiritdingiz."
        }), 400

    count = conn.execute(
        "SELECT COUNT(*) as c FROM acts WHERE warehouse_id=?", (user["warehouse_id"],)
    ).fetchone()["c"]
    act_number = count + 1

    conn.execute(
        "INSERT INTO acts (act_number, date, model, quantity, warehouse_id) VALUES (?,?,?,?,?)",
        (act_number, today(), model, qty, user["warehouse_id"])
    )
    conn.execute(
        """INSERT INTO products (model, warehouse_id, current_quantity) VALUES (?,?,?)
           ON CONFLICT(model, warehouse_id) DO UPDATE SET current_quantity = current_quantity + ?""",
        (model, user["warehouse_id"], qty, qty)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Akt yaratildi, sklad yangilandi!", "act_number": act_number}), 201

# ── SALES ─────────────────────────────────────────────────────────────────────

@app.get("/api/sales")
def get_sales():
    user, err = auth("admin")
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM sales WHERE warehouse_id=? ORDER BY id DESC",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/sales")
def add_sale():
    user, err = auth("admin")
    if err: return err
    data = request.json
    model = (data.get("model") or "").strip()
    quantity = data.get("quantity")
    if not model or not quantity or int(quantity) < 1:
        return jsonify({"error": "Model va miqdorni kiriting!"}), 400
    conn = get_conn()
    product = conn.execute(
        "SELECT * FROM products WHERE model=? AND warehouse_id=?",
        (model, user["warehouse_id"])
    ).fetchone()
    if not product or product["current_quantity"] < int(quantity):
        conn.close()
        return jsonify({"error": "Omborda yetarli mahsulot yo'q!"}), 400
    conn.execute(
        "UPDATE products SET current_quantity = current_quantity - ? WHERE model=? AND warehouse_id=?",
        (int(quantity), model, user["warehouse_id"])
    )
    conn.execute(
        "INSERT INTO sales (date, model, quantity, warehouse_id) VALUES (?,?,?,?)",
        (today(), model, int(quantity), user["warehouse_id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Chiqim amalga oshirildi!"}), 201

# ── STATS ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    user, err = auth("admin")
    if err: return err
    wid = user["warehouse_id"]
    conn = get_conn()

    total_qty = conn.execute(
        "SELECT COALESCE(SUM(current_quantity),0) as t FROM products WHERE warehouse_id=?", (wid,)
    ).fetchone()["t"]
    total_prod = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM production WHERE warehouse_id=?", (wid,)
    ).fetchone()["t"]
    total_acts = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM acts WHERE warehouse_id=?", (wid,)
    ).fetchone()["t"]
    total_sales = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM sales WHERE warehouse_id=?", (wid,)
    ).fetchone()["t"]
    alerts = conn.execute(
        "SELECT COUNT(*) as c FROM products WHERE warehouse_id=? AND current_quantity<=10", (wid,)
    ).fetchone()["c"]

    # Jami kutayotgan tayyor mahsulotlar
    total_ready = conn.execute(
        "SELECT COALESCE(SUM(quantity),0) as t FROM production WHERE warehouse_id=?", (wid,)
    ).fetchone()["t"] - total_acts

    top_sales = conn.execute(
        "SELECT model, SUM(quantity) as total FROM sales WHERE warehouse_id=? GROUP BY model ORDER BY total DESC LIMIT 5", (wid,)
    ).fetchall()
    low_sales = conn.execute(
        "SELECT model, SUM(quantity) as total FROM sales WHERE warehouse_id=? GROUP BY model ORDER BY total ASC LIMIT 5", (wid,)
    ).fetchall()

    conn.close()
    return jsonify({
        "total_qty": total_qty,
        "total_prod": total_prod,
        "total_acts": total_acts,
        "total_sales": total_sales,
        "total_ready": max(0, total_ready),
        "alerts": alerts,
        "top_sales": [dict(r) for r in top_sales],
        "low_sales": [dict(r) for r in low_sales],
    })

@app.get("/api/alerts")
def get_alerts():
    user, err = auth()
    if err: return err
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM products WHERE warehouse_id=? AND current_quantity<=10 ORDER BY current_quantity ASC",
        (user["warehouse_id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
