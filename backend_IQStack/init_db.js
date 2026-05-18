const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const dbPath = 'C:/Users/msorl/Desktop/IQSTACK/BASE DE DATOS/iqstack.db';

// Crear directorio si no existe
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Borrar base de datos antigua si existe para recrear limpia con todo el esquema
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

async function init() {
    console.log('Iniciando inicialización de SQLite con DDL completo...');
    
    const hashRosa = await bcrypt.hash('password123', 12);
    const hashAdmin = await bcrypt.hash('admin123', 12);
    const hashTech = await bcrypt.hash('unai123', 12);

    db.serialize(() => {
        // 1. ROLES
        db.run(`CREATE TABLE IF NOT EXISTS roles (
            role_name TEXT PRIMARY KEY
        )`);
        db.run(`INSERT INTO roles (role_name) VALUES ('Admin_Global'), ('Support_Tech'), ('Client_PYME'), ('Client_ONG')`);

        // 2. USERS
        db.run(`CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL REFERENCES roles(role_name),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`INSERT INTO users (email, password_hash, role) VALUES ('rosa@panaderialopez.com', ?, 'Client_PYME')`, [hashRosa]);
        db.run(`INSERT INTO users (email, password_hash, role) VALUES ('admin@iqstack.es', ?, 'Admin_Global')`, [hashAdmin]);
        db.run(`INSERT INTO users (email, password_hash, role) VALUES ('unai.garcia@iqstack.es', ?, 'Support_Tech')`, [hashTech]);

        // 3. CLIENTS
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            client_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
            company_name TEXT NOT NULL,
            cif TEXT UNIQUE NOT NULL,
            client_type TEXT CHECK(client_type IN ('PYME', 'ONG')) NOT NULL,
            phone TEXT,
            address TEXT,
            city TEXT,
            province TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`INSERT INTO clients (user_id, company_name, cif, client_type, phone, address, city, province) 
                VALUES (1, 'Panadería López SL', 'B12345678', 'PYME', '964470000', 'Calle Mayor 14', 'Benicarló', 'Castellón')`);

        // 4. HOSTING PLANS
        db.run(`CREATE TABLE IF NOT EXISTS hosting_plans (
            plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            price_eur REAL NOT NULL,
            cpu_cores INTEGER NOT NULL,
            ram_gb INTEGER NOT NULL,
            ssd_gb INTEGER NOT NULL,
            description TEXT
        )`);

        db.run(`INSERT INTO hosting_plans (name, price_eur, cpu_cores, ram_gb, ssd_gb, description) VALUES
            ('Standard Eco', 15.00, 2, 4, 40, 'Perfecto para webs corporativas locales con hosting 100% verde.'),
            ('Premium Eco', 35.00, 4, 8, 80, 'Ideal para tiendas online locales con rendimiento superior.'),
            ('Assisted Eco', 75.00, 4, 16, 160, 'Soporte humano ilimitado y gestión de actualizaciones por técnicos de IQSTACK.')`);

        // 5. CLIENT PLANS
        db.run(`CREATE TABLE IF NOT EXISTS client_plans (
            client_plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER REFERENCES clients(client_id) ON DELETE CASCADE,
            plan_id INTEGER REFERENCES hosting_plans(plan_id),
            discount_pct REAL NOT NULL DEFAULT 0.0,
            final_price_eur REAL NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            is_active INTEGER NOT NULL DEFAULT 1
        )`);

        // Rosa contrata el plan Standard Eco con 0% descuento (PYME)
        db.run(`INSERT INTO client_plans (client_id, plan_id, discount_pct, final_price_eur, start_date, is_active)
                VALUES (1, 1, 0.0, 15.00, '2026-01-01', 1)`);

        // 6. INVOICES
        db.run(`CREATE TABLE IF NOT EXISTS invoices (
            invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER REFERENCES clients(client_id),
            invoice_number TEXT UNIQUE NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE NOT NULL,
            subtotal_eur REAL NOT NULL,
            vat_pct REAL NOT NULL DEFAULT 21.0,
            vat_amount_eur REAL NOT NULL,
            total_eur REAL NOT NULL,
            status TEXT CHECK(status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')) NOT NULL DEFAULT 'PENDING',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`INSERT INTO invoices (client_id, invoice_number, issue_date, due_date, subtotal_eur, vat_pct, vat_amount_eur, total_eur, status) VALUES
            (1, 'INV-2026-0001', '2026-04-01', '2026-04-15', 15.00, 21.0, 3.15, 18.15, 'PAID'),
            (1, 'INV-2026-0002', '2026-05-01', '2026-05-15', 15.00, 21.0, 3.15, 18.15, 'PENDING')`);

        // 7. INVOICE ITEMS
        db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
            item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price_eur REAL NOT NULL,
            line_total_eur REAL NOT NULL
        )`);

        db.run(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_eur, line_total_eur) VALUES
            (1, 'Suscripción Mensual - Standard Eco (Abril 2026)', 1, 15.00, 15.00),
            (2, 'Suscripción Mensual - Standard Eco (Mayo 2026)', 1, 15.00, 15.00)`);

        // 8. SUPPORT TICKETS
        db.run(`CREATE TABLE IF NOT EXISTS support_tickets (
            ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER REFERENCES clients(client_id),
            assigned_to_user_id INTEGER REFERENCES users(user_id),
            opened_by_user_id INTEGER REFERENCES users(user_id),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) NOT NULL DEFAULT 'MEDIUM',
            status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')) NOT NULL DEFAULT 'OPEN',
            channel TEXT CHECK(channel IN ('CHAT', 'PHONE', 'EMAIL')) NOT NULL DEFAULT 'CHAT',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Escapar comillas simples duplicando el caracter en SQLite: ''
        db.run(`INSERT INTO support_tickets (client_id, assigned_to_user_id, opened_by_user_id, title, description, priority, status, channel) VALUES
            (1, 3, 1, 'Error con el certificado SSL', 'El certificado Let''s Encrypt no se renovó automáticamente y el navegador da error de seguridad.', 'HIGH', 'IN_PROGRESS', 'CHAT')`);

        // 9. TICKET MESSAGES
        db.run(`CREATE TABLE IF NOT EXISTS ticket_messages (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(user_id),
            message_body TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`INSERT INTO ticket_messages (ticket_id, user_id, message_body) VALUES
            (1, 1, 'Hola, mi web no carga con https seguro. Podéis revisarlo? Es urgente para las ventas.'),
            (1, 3, 'Hola Rosa! Unai por aquí. He verificado que faltaba refrescar el reto DNS en Cloudflare. Ya está solucionado y renovado. ¿Puedes confirmar?')`);

        // 10. ECOLOGICAL METRICS
        db.run(`CREATE TABLE IF NOT EXISTS ecological_metrics (
            metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER REFERENCES clients(client_id),
            metric_month DATE NOT NULL,
            kwh_generated REAL NOT NULL,
            kwh_consumed REAL NOT NULL,
            kwh_saved REAL NOT NULL,
            co2_saved_kg REAL NOT NULL,
            renewable_pct REAL NOT NULL DEFAULT 100.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(client_id, metric_month)
        )`);

        db.run(`INSERT INTO ecological_metrics (client_id, metric_month, kwh_generated, kwh_consumed, kwh_saved, co2_saved_kg) VALUES
            (1, '2026-01-01', 120.5, 30.2, 90.3, 21.03),
            (1, '2026-02-01', 140.2, 32.1, 108.1, 25.18),
            (1, '2026-03-01', 180.8, 35.5, 145.3, 33.85),
            (1, '2026-04-01', 210.4, 38.0, 172.4, 40.16)`);
    });

    console.log('Base de datos SQLite inicializada exitosamente con todo el esquema relacional de IQSTACK.');
}

init();
