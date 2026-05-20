import sqlite3
import hashlib
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "omborxona.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT    UNIQUE NOT NULL,
            password  TEXT    NOT NULL,
            role      TEXT    NOT NULL DEFAULT 'worker',
            warehouse_id TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            model            TEXT    NOT NULL,
            warehouse_id     TEXT    NOT NULL,
            current_quantity INTEGER NOT NULL DEFAULT 0,
            UNIQUE(model, warehouse_id)
        );

        CREATE TABLE IF NOT EXISTS production (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            date         TEXT    NOT NULL,
            worker_id    INTEGER NOT NULL,
            worker_name  TEXT    NOT NULL,
            model        TEXT    NOT NULL,
            quantity     INTEGER NOT NULL,
            warehouse_id TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS acts (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            act_number   INTEGER NOT NULL,
            date         TEXT    NOT NULL,
            model        TEXT    NOT NULL,
            quantity     INTEGER NOT NULL,
            warehouse_id TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sales (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            date         TEXT    NOT NULL,
            model        TEXT    NOT NULL,
            quantity     INTEGER NOT NULL,
            warehouse_id TEXT    NOT NULL
        );
    """)

    # Demo admin
    existing = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        c.execute(
            "INSERT INTO users (username, password, role, warehouse_id) VALUES (?,?,?,?)",
            ("admin", hash_password("admin123"), "admin", "W001")
        )
        # Demo products
        demo_products = [
            ("Model-A", "W001", 25),
            ("Model-B", "W001", 8),
            ("Model-C", "W001", 50),
        ]
        c.executemany(
            "INSERT OR IGNORE INTO products (model, warehouse_id, current_quantity) VALUES (?,?,?)",
            demo_products
        )
        # Demo production record
        c.execute(
            "INSERT INTO production (date, worker_id, worker_name, model, quantity, warehouse_id) VALUES (?,?,?,?,?,?)",
            ("2025-05-18", 1, "admin", "Model-A", 10, "W001")
        )

    conn.commit()
    conn.close()
