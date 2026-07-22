const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = new Database("database.sqlite");

// Create the operations table
db.prepare(`
    CREATE TABLE IF NOT EXISTS operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine TEXT NOT NULL,
        job_number TEXT,
        operator TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        status TEXT NOT NULL
    )
`).run();


// ===============================
// START AN OPERATION
// ===============================
app.post("/api/operations/start", (req, res) => {

    const {
        machine,
        job_number,
        operator
    } = req.body;

    // Check required data
    if (!machine) {
        return res.status(400).json({
            error: "Machine is required"
        });
    }

    // Record the start time
    const startTime = new Date().toISOString();

    // Insert operation into database
    const result = db.prepare(`
        INSERT INTO operations
        (machine, job_number, operator, start_time, status)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        machine,
        job_number || "",
        operator || "",
        startTime,
        "RUNNING"
    );

    res.json({
        message: "Operation started successfully",
        operationId: result.lastInsertRowid,
        startTime: startTime
    });
});


// ===============================
// STOP AN OPERATION
// ===============================
app.post("/api/operations/stop/:id", (req, res) => {

    const operationId = req.params.id;

    // Find the operation
    const operation = db.prepare(`
        SELECT * FROM operations
        WHERE id = ?
    `).get(operationId);

    // Check if operation exists
    if (!operation) {
        return res.status(404).json({
            error: "Operation not found"
        });
    }

    // Check if already completed
    if (operation.status === "COMPLETED") {
        return res.status(400).json({
            error: "Operation already completed"
        });
    }

    // Record end time
    const endTime = new Date();

    // Convert start time
    const startTime = new Date(operation.start_time);

    // Calculate duration in seconds
    const duration = Math.floor(
        (endTime - startTime) / 1000
    );

    // Update the operation
    db.prepare(`
        UPDATE operations
        SET end_time = ?,
            duration = ?,
            status = ?
        WHERE id = ?
    `).run(
        endTime.toISOString(),
        duration,
        "COMPLETED",
        operationId
    );

    res.json({
        message: "Operation stopped successfully",
        duration: duration
    });
});


// ===============================
// GET ALL OPERATIONS
// ===============================
app.get("/api/operations", (req, res) => {

    const operations = db.prepare(`
        SELECT *
        FROM operations
        ORDER BY id DESC
    `).all();

    res.json(operations);
});


// ===============================
// TEST ROUTE
// ===============================
app.get("/", (req, res) => {
    res.send("Cutting Monitoring System Backend is running!");
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

