# Spare Parts Tracker — Demo Guide

**Live app:** https://sparepartsb.vercel.app/

Takes about 5 minutes. Just read this and follow along.

---

## What it is (say this first)

> "This is a live digital record of a warehouse. Workers add parts by taking a
> photo, and managers can instantly see what we have, how much is free, and
> where it is — so we stop rebuying parts we already own."

---

## Before you start

1. Sign in with the Manager account provided by the warehouse administrator.
   The site is invitation-only and every change is attributed to a user.
2. Open this link once and **save the image to your laptop** — you'll upload it
   in Step 3:
   https://sparepartsb.vercel.app/labels/m9208-gga-3-label.png

---

## The 5 steps

### Step 1 — Show the warehouse (Dashboard)
- Point to the top numbers: **316 Unique Parts, 4,213 Total Units.**
- Say: *"This is our actual Johnson Controls warehouse — every line item from the
  inventory export, live and up to date, not a spreadsheet from last month."*

### Step 2 — Find a part (Inventory → Search)
- Click **Inventory**, type **M9208** in the search box.
- It shows the **Johnson Controls Actuator: 12 total, 9 available,
  Warehouse A · Aisle 3 · Shelf B · Bin 12.**
- Say: *"In two seconds a manager knows we have it and exactly which shelf it's
  on. No walking the floor, no phone calls."*

### Step 3 — Add new stock with a photo (Scan a Part)
- Click **Scan a Part** → upload the label image you saved → click
  **Extract Part Details**.
- Say: *"A worker doesn't type anything. They just photograph the label and the
  app reads it."*

### Step 4 — The smart part (no duplicates)
- Click **Continue**. A box pops up: **"Matching part found."**
- Enter **4** units → confirm. The total goes **12 → 16.**
- Say: *"The app recognized this part already exists and just added to the count
  — instead of creating a messy duplicate. This is how the data stays clean."*

### Step 5 — Save money (Reservation)
- Open that part → click **Reserve** → pick **HVAC System Upgrade**, quantity
  **5** → create.
- Watch **Available** drop instantly.
- Say: *"Now every manager sees only what's truly free. Nobody orders parts we
  already have on the shelf. That's the money saved, right there."*

### Closing line
> "This is loaded with our real warehouse export — 316 parts across the whole
> rack layout. One shared record that's always current, for the whole company."

---

## If something acts up

- **Scan is slow?** Click **"Enter details manually"** on the Scan page and type
  the part number **M9208-GGA-3** — the "Matching part found" step still works
  the same way.
- **Need a clean practice run?** Ask an administrator to use a separate staging
  environment. Production inventory cannot be reset from the web app.

---

## The problem → solution (for questions)

- **Problem:** Warehouses lose money because nobody really knows what's on the
  shelves. Managers rebuy parts that are already in stock; workers track things
  on clipboards and spreadsheets that are always out of date.
- **Solution:** One shared, always-current digital record. Add parts by photo,
  search in seconds, and see real-time availability so no one buys duplicates.
