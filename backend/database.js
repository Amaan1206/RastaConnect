const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) { console.error(err.message); throw err; }
  console.log('Connected to the RastaConnect database.');
  db.run("PRAGMA foreign_keys = ON");
  db.serialize(() => {
    console.log("Running database migrations...");
    db.run(`CREATE TABLE IF NOT EXISTS users ( id INTEGER PRIMARY KEY AUTOINCREMENT, fullName TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL )`);
    db.run(`CREATE TABLE IF NOT EXISTS rides ( id INTEGER PRIMARY KEY AUTOINCREMENT, driverId INTEGER NOT NULL, vehicleId INTEGER, origin TEXT NOT NULL, destination TEXT NOT NULL, departureTime TEXT NOT NULL, availableSeats INTEGER NOT NULL, price REAL NOT NULL, status TEXT NOT NULL DEFAULT 'active', FOREIGN KEY (driverId) REFERENCES users (id), FOREIGN KEY (vehicleId) REFERENCES vehicles(id) )`);
    db.run(`CREATE TABLE IF NOT EXISTS bookings ( id INTEGER PRIMARY KEY AUTOINCREMENT, rideId INTEGER NOT NULL, passengerId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', FOREIGN KEY (rideId) REFERENCES rides (id), FOREIGN KEY (passengerId) REFERENCES users (id) )`);
    db.run(`CREATE TABLE IF NOT EXISTS vehicles ( id INTEGER PRIMARY KEY AUTOINCREMENT, ownerId INTEGER NOT NULL, type TEXT NOT NULL, make TEXT NOT NULL, model TEXT NOT NULL, color TEXT NOT NULL, registrationNumber TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending', FOREIGN KEY (ownerId) REFERENCES users (id) )`);

    // Migrations
    db.run("ALTER TABLE rides ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", () => {});
    db.run("ALTER TABLE rides ADD COLUMN vehicleId INTEGER REFERENCES vehicles(id)", () => {});
    db.run("ALTER TABLE users ADD COLUMN phoneNumber TEXT", () => {});
    db.run("ALTER TABLE users ADD COLUMN phoneVerified INTEGER DEFAULT 0", () => {});
    db.run("ALTER TABLE users ADD COLUMN panNumber TEXT", () => {});
    db.run("ALTER TABLE users ADD COLUMN panVerified INTEGER DEFAULT 0", () => {});
    // --- NEW: Profile Details Migrations ---
    db.run("ALTER TABLE users ADD COLUMN gender TEXT", () => {});
    db.run("ALTER TABLE users ADD COLUMN age INTEGER", () => {});
    db.run("ALTER TABLE users ADD COLUMN talkativeness TEXT", () => {});
    db.run("ALTER TABLE users ADD COLUMN musicPreference TEXT", () => {});
    console.log("Migrations complete.");
  });
});
module.exports = db;