// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0.0,
      tasks_completed INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_text TEXT NOT NULL,
      reward REAL NOT NULL
    )
  `);

  db.get(`SELECT COUNT(*) AS count FROM tasks`, (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO tasks (task_text, reward) VALUES (?, ?)");
      stmt.run("ENTRY-8932: Verification Code TX-9910", 2.50);
      stmt.run("DATA-1042: Product SKU #77491-X", 1.80);
      stmt.run("FORM-5519: Order ID #48201-B", 3.00);
      stmt.run("CODE-4412: Serial No SN-10293-Z", 2.00);
      stmt.finalize();
    }
  });
});

// API Routes
app.post('/api/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)`,
      [name, phone, email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Phone or Email already registered.' });
        }
        res.json({ message: 'Registration successful! Please login.' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  db.get(`SELECT * FROM users WHERE phone = ?`, [phone], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        balance: user.balance,
        tasks_completed: user.tasks_completed
      }
    });
  });
});

app.get('/api/user/:id', (req, res) => {
  db.get(`SELECT id, name, phone, email, balance, tasks_completed FROM users WHERE id = ?`, [req.params.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  });
});

app.get('/api/task', (req, res) => {
  db.get(`SELECT * FROM tasks ORDER BY RANDOM() LIMIT 1`, (err, task) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch task.' });
    res.json(task);
  });
});

app.post('/api/submit-task', (req, res) => {
  const { userId, taskId, inputData } = req.body;

  db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, task) => {
    if (err || !task) return res.status(400).json({ error: 'Invalid task.' });

    if (inputData.trim() !== task.task_text.trim()) {
      return res.status(400).json({ error: 'Incorrect entry! Please type exactly as shown.' });
    }

    db.run(
      `UPDATE users SET balance = balance + ?, tasks_completed = tasks_completed + 1 WHERE id = ?`,
      [task.reward, userId],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update balance.' });

        db.get(`SELECT balance, tasks_completed FROM users WHERE id = ?`, [userId], (err, updatedUser) => {
          res.json({
            message: `Task completed! Earned $${task.reward.toFixed(2)}`,
            balance: updatedUser.balance,
            tasks_completed: updatedUser.tasks_completed
          });
        });
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});