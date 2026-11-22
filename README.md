# insyst-inventory

# InSyst: Inventory System (Prototype)

A small-business inventory web app with a login, dashboard, product management, and a REST API.

**Student:** [Your Name]
**Subject / Section:** [Your Subject and Section]
**Status:** Working prototype that runs on localhost. Database integration is planned.

## Requirements

- Node.js (version 18 or newer)
- A web browser

No `npm install` is needed. The server uses only Node.js built-in modules.

## How to run

1. Download or clone this repository.
2. Open the `InSyst` folder in VS Code (or any terminal).
3. Run `node server.js`.
4. Check that the terminal prints `InSyst running at http://localhost:3000`.
5. Open `http://localhost:3000` in your browser. Do not open `index.html` directly, or login will not work.
6. Log in with the demo account:
   - Email: `admin@insyst.ph`
   - Password: `admin123`

To stop the server, press Ctrl+C in the terminal.

## Features

- **Login and Register:** accounts are stored on the server with hashed passwords.
- **Dashboard:** total products, total units, low-stock count (10 units and lower), and recent inventory activity. The cards are clickable. The low-stock card opens the filtered product list.
- **Products:** search by name or ID, filter by category, sort by column, pagination, view, edit, and archive.
- **Add / Edit product:** form with validation for name, category, price, and quantity.
- **Archived page:** lists archived products and lets you restore them.



## Current limitations 

- Runs on localhost only.
- Users, products, and activity are stored in JSON files in the `data` folder, not in a database.
- The product endpoints do not require login.
- Password reset is not set up yet.

## Planned work

- Move user accounts and login to MongoDB Atlas.
- Improve the UI/UX.
