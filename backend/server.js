const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "letmein";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// ===============================
// DATABASE SETUP
// ===============================
const isPostgres = !!process.env.DATABASE_URL;

let db;
let pgPool;

if (isPostgres) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    db = {
        run: async (sql, params) => { const r = await pgPool.query(sql, params); return { lastInsertRowid: r.rows[0]?.id }; },
        get: async (sql, params) => { const r = await pgPool.query(sql, params); return r.rows[0] || null; },
        all: async (sql, params) => { const r = await pgPool.query(sql, params); return r.rows; },
    };
    const init = async () => {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS operations (
                id SERIAL PRIMARY KEY,
                machine TEXT NOT NULL,
                job_number TEXT,
                operator TEXT,
                bl_number TEXT,
                client TEXT,
                origin_matiere TEXT,
                material_type TEXT,
                thickness TEXT,
                dimension TEXT,
                quantity TEXT,
                weight TEXT,
                carre_utile TEXT,
                programme TEXT,
                nombre_toles TEXT,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration INTEGER,
                status TEXT NOT NULL
            )
        `);
        try { await pgPool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_running_machine ON operations(machine) WHERE status = 'RUNNING'`); } catch (e) {}
        console.log('PostgreSQL connected');
    };
    init();
} else {
    db = new Database("database.sqlite");
    db.prepare(`
        CREATE TABLE IF NOT EXISTS operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine TEXT NOT NULL,
            job_number TEXT,
            operator TEXT,
            bl_number TEXT,
            client TEXT,
            origin_matiere TEXT,
            material_type TEXT,
            thickness TEXT,
            dimension TEXT,
            quantity TEXT,
            weight TEXT,
            carre_utile TEXT,
            programme TEXT,
            nombre_toles TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration INTEGER,
            status TEXT NOT NULL
        )
    `).run();
    const alterColumns = [
        "ALTER TABLE operations ADD COLUMN bl_number TEXT", "ALTER TABLE operations ADD COLUMN client TEXT",
        "ALTER TABLE operations ADD COLUMN origin_matiere TEXT", "ALTER TABLE operations ADD COLUMN material_type TEXT",
        "ALTER TABLE operations ADD COLUMN thickness TEXT", "ALTER TABLE operations ADD COLUMN dimension TEXT",
        "ALTER TABLE operations ADD COLUMN quantity TEXT", "ALTER TABLE operations ADD COLUMN weight TEXT",
        "ALTER TABLE operations ADD COLUMN carre_utile TEXT", "ALTER TABLE operations ADD COLUMN programme TEXT",
        "ALTER TABLE operations ADD COLUMN nombre_toles TEXT"
    ];
    for (const sql of alterColumns) { try { db.prepare(sql).run(); } catch (err) {} }
    try {
        db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_running_machine ON operations(machine) WHERE status = 'RUNNING'`).run();
    } catch (e) {}
    console.log('SQLite connected');
}


// ===============================
// DATABASE WRAPPER
// ===============================
const toSqlite = (sql) => sql.replace(/\$(\d+)/g, '?').replace(/\s+RETURNING\s+\w+\s*$/i, '');

const p = (params) => params || [];

const dbRun = async (sql, params) => {
    if (isPostgres) {
        const r = await pgPool.query(sql, params);
        return { lastInsertRowid: r.rows[0]?.id };
    }
    return db.prepare(toSqlite(sql)).run(p(params));
};

const dbGet = async (sql, params) => {
    if (isPostgres) {
        const r = await pgPool.query(sql, params);
        return r.rows[0] || null;
    }
    return db.prepare(toSqlite(sql)).get(p(params));
};

const dbAll = async (sql, params) => {
    if (isPostgres) {
        const r = await pgPool.query(sql, params);
        return r.rows;
    }
    return db.prepare(toSqlite(sql)).all(p(params));
};

// ===============================
// START AN OPERATION
// ===============================
app.post("/api/operations/start", async (req, res) => {

    const {
        machine, job_number, operator, bl_number, client, origin_matiere,
        material_type, thickness, dimension, quantity, weight, carre_utile, programme, nombre_toles
    } = req.body;

    if (!machine) {
        return res.status(400).json({ error: "Machine is required" });
    }

    try {
        const existing = await dbGet(
            `SELECT COUNT(*) as cnt FROM operations WHERE machine = $1 AND status = 'RUNNING'`,
            [machine]
        );

        if (existing && existing.cnt > 0) {
            return res.status(409).json({ error: 'Machine is already running an operation' });
        }

        const startTime = new Date().toISOString();
        const result = await dbRun(
            `INSERT INTO operations (machine, job_number, operator, bl_number, client, origin_matiere, material_type, thickness, dimension, quantity, weight, carre_utile, programme, nombre_toles, start_time, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
            [machine, job_number||"", operator||"", bl_number||null, client||null, origin_matiere||null, material_type||null, thickness||null, dimension||null, quantity||null, weight||null, carre_utile||null, programme||null, nombre_toles||null, startTime, "RUNNING"]
        );

        res.json({ message: "Operation started successfully", operationId: result.lastInsertRowid, startTime });
    } catch (err) {
        if (err && (err.code === 'SQLITE_CONSTRAINT' || /unique constraint/i.test(err.message||''))) {
            return res.status(409).json({ error: 'Machine is already running an operation' });
        }
        console.error('Failed to insert operation:', err && err.message);
        return res.status(500).json({ error: 'Failed to start operation' });
    }
});


// ===============================
// STOP AN OPERATION
// ===============================
app.post("/api/operations/stop/:id", async (req, res) => {

    const operationId = req.params.id;

    try {
        const operation = await dbGet(`SELECT * FROM operations WHERE id = $1`, [operationId]);

        if (!operation) {
            return res.status(404).json({ error: "Operation not found" });
        }

        if (operation.status === "COMPLETED") {
            return res.status(400).json({ error: "Operation already completed" });
        }

        const bodyEnd = req.body && req.body.end_time;
        let endTime;
        if (bodyEnd) {
            endTime = new Date(bodyEnd);
            if (isNaN(endTime.getTime())) {
                return res.status(400).json({ error: 'Invalid end_time' });
            }
        } else {
            endTime = new Date();
        }

        const startTime = new Date(operation.start_time);
        const duration = Math.floor((endTime - startTime) / 1000);

        await dbRun(`UPDATE operations SET end_time=$1, duration=$2, status=$3 WHERE id=$4`,
            [endTime.toISOString(), duration, "COMPLETED", operationId]);

        res.json({ message: "Operation stopped successfully", duration });
    } catch (err) {
        console.error('Failed to stop operation:', err && err.message);
        return res.status(500).json({ error: 'Failed to stop operation' });
    }
});


// ===============================
// GET ALL OPERATIONS
// ===============================
app.get("/api/operations", async (req, res) => {
    try {
        const operations = await dbAll(`SELECT * FROM operations ORDER BY id DESC`);
        res.json(operations);
    } catch (err) {
        console.error('Failed to fetch operations:', err && err.message);
        res.status(500).json({ error: 'Failed to fetch operations' });
    }
});


// ===============================
// DELETE ALL OPERATIONS (clear history)
// ===============================
app.delete("/api/operations", async (req, res) => {
    try {
        await dbRun(`DELETE FROM operations`);
        res.json({ message: 'Operation history cleared' });
    } catch (err) {
        console.error('Failed to clear operations:', err && err.message);
        res.status(500).json({ error: 'Failed to clear operation history' });
    }
});


// ===============================
// MANUAL OPERATION (start &/or end provided)
// ===============================
app.post("/api/operations/manual", async (req, res) => {
    const { machine, job_number, operator, bl_number, client, origin_matiere, material_type, thickness, dimension, quantity, weight, carre_utile, programme, nombre_toles, start_time, end_time } = req.body;

    if (!machine || !start_time) {
        return res.status(400).json({ error: 'Machine and start_time are required' });
    }

    const start = new Date(start_time);
    if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid start_time' });
    }

    let end = null;
    let duration = null;
    let status = 'RUNNING';

    if (end_time) {
        end = new Date(end_time);
        if (isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid end_time' });
        }
        duration = Math.floor((end - start) / 1000);
        status = 'COMPLETED';
    }

    try {
        const result = await dbRun(
            `INSERT INTO operations (machine, job_number, operator, bl_number, client, origin_matiere, material_type, thickness, dimension, quantity, weight, carre_utile, programme, nombre_toles, start_time, end_time, duration, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
            [machine, job_number||'', operator||'', bl_number||null, client||null, origin_matiere||null, material_type||null, thickness||null, dimension||null, quantity||null, weight||null, carre_utile||null, programme||null, nombre_toles||null, start.toISOString(), end ? end.toISOString() : null, duration, status]
        );

        res.json({ message: 'Manual operation recorded', operationId: result.lastInsertRowid });
    } catch (err) {
        console.error('Failed to insert manual operation:', err && err.message);
        res.status(500).json({ error: 'Failed to record manual operation' });
    }
});

// ===============================
// ADMIN LOGIN
// ===============================
app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.json({
            success: true,
            username: ADMIN_USERNAME,
            role: "admin"
        });
    }

    return res.status(401).json({ error: "Invalid admin credentials" });
});

// ===============================
// FRONTEND SPA ROUTE
// ===============================
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return next();
    }
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {

    console.log(`
========================================
 CUTTING MONITORING SYSTEM
========================================

Backend server is running on:
http://localhost:${PORT}

`);
});

