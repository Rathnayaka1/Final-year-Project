# Smart Service Center — Automotive Management & AI-Powered Demand Forecasting

An enterprise-grade, multi-tenant automotive service management platform developed for service centers in Sri Lanka. The system delivers an end-to-end solution combining a **Customer Mobile Application**, a **Staff Web Administration Portal**, a **Centralized REST API Backend**, and an **AI/ML Inventory Demand Forecasting Engine**.

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │       MongoDB Atlas Cloud Database      │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │      Node.js / Express REST API         │
                    │   (Authentication, RBAC, Data Logic)    │
                    └───────▲─────────────────▲───────────────┘
                            │                 │
            ┌───────────────┴───┐         ┌───┴─────────────────┐
            │                   │         │                     │
            ▼                   ▼         ▼                     ▼
   ┌─────────────────┐ ┌─────────────────┐       ┌────────────────────────┐
   │ Customer Mobile │ │ Admin Web Portal│ ◄────►│   AI/ML Forecasting    │
   │ App (React      │ │ (React + Vite)  │       │  Engine (Python/Ridge) │
   │  Native / Expo) │ └─────────────────┘       └────────────────────────┘
   └─────────────────┘
```

---

## 🌟 Key Platform Components

### 1. 📱 Customer Mobile Application (`mobile-app/`)
*Built with React Native & Expo*
- **Appointment Scheduling:** Book periodic vehicle services, body wash, repairs, and diagnostics.
- **Service Center Locator:** Interactive map integration showing nearby service center locations and operational hours.
- **Live Queue & Status Tracking:** Real-time visibility into vehicle maintenance stages (Pending, In Progress, Ready for Pickup).
- **Branch Loyalty Points:** Earn and view loyalty rewards earned per service center visit.
- **Automated Service Reminders:** Push notifications for upcoming 3-month periodic maintenance and oil changes.

### 2. 💻 Staff Web Administration Portal (`admin-web/`)
*Built with React 18, Vite, and Vanilla CSS Design System*
- **Multi-Tenant Branch Isolation:** Downtown and Westside service centers operate in separate, isolated workspaces for revenue, inventory, staff, and appointments.
- **Role-Based Access Control (RBAC):** Distinct permission tiers for **Admin**, **Manager**, **Supervisor**, **Cashier**, and **Receptionist**.
- **Billing & Itemized Checkout:** Auto-calculates base package costs, itemized labor tasks, and auto-deducts spare parts from active inventory.
- **Official PDF Invoice Generator:** Instant download of branded, itemized invoices via `jsPDF`.
- **Technician & Queue Management:** Assign mechanics and track workload across active service bays.
- **Branch-Specific Loyalty Program:** Calculate discounts and prevent cross-branch loyalty point redemption.
- **AI Inventory Forecasting Dashboard:** Visual interface for projecting spare parts consumption and stock replenishment.

### 3. ⚙️ Central Backend REST API (`backend/`)
*Built with Node.js, Express, and Mongoose*
- **Secure Authentication:** JWT tokens with cryptographic hashing (`bcryptjs`).
- **Database Modeling:** Schemas for Service Centers, Users, Customers, Appointments, Services, Stocks, Payments, and Notifications.
- **Automated Stock Sync:** Real-time stock decrement upon bill completion.
- **Background Service Reminders:** Automated detection of upcoming 7-day maintenance due dates.

### 4. 🧠 AI Inventory Demand Forecasting (`inventory-ml/`)
*Built with Python 3.12, Scikit-Learn, and Ridge Regression*
- Predicts future spare parts demand up to 366 days in advance.
- Calendar-aware feature engineering including weekday patterns, seasonal cycles, and Sri Lankan holiday calendars.
- Computes projected stock shortages, buffer days, and pack-rounded reorder recommendations.

---

## 📁 Repository Structure

| Folder / File | Technology | Description |
| --- | --- | --- |
| `admin-web/` | React 18, Vite | Multi-tenant Web Management Portal for operations and billing |
| `backend/` | Node.js, Express, MongoDB | REST API service with RBAC, database controllers, and routes |
| `mobile-app/` | React Native, Expo | Mobile application for vehicle owners and customers |
| `inventory-ml/` | Python, Scikit-Learn | Machine learning demand forecasting API, model artifacts & dataset |
| `inventory-ml/service.py` | Python (HTTP API) | Lightweight microservice serving daily demand predictions |
| `inventory-ml/Inventory_Daily_Training.ipynb` | Jupyter Notebook | Training, cross-validation, and performance evaluation pipeline |
| `Setup-System.cmd` | Windows Script | One-click local dependency installation |
| `Start-System.cmd` | Windows Script | Starts local development services |

---

## 🚀 Quick Start & How to Run Locally

### Prerequisites
- **Node.js** v20+ or v22+
- **Python** 3.10+ (for ML forecast service)
- **Git**
- Active internet connection (for MongoDB Atlas connection)

---

### Step 1: Backend Setup
```bash
cd "final project/backend"
npm install
npm run dev
```
*Backend runs on: `http://localhost:5004` (Health check: `http://localhost:5004/health`)*

---

### Step 2: Admin Web Portal Setup
```bash
cd "final project/admin-web"
npm install
npm run dev
```
*Open in your browser: `http://localhost:5173`*

#### Demo Sign-In Credentials (Downtown Branch):
| Role | Email | Password |
| --- | --- | --- |
| **Administrator** | `admin@servicecenter.dev` | `Admin123!` |
| **Manager** | `manager@servicecenter.dev` | `Manager123!` |
| **Supervisor** | `supervisor@servicecenter.dev` | `Supervisor123!` |
| **Cashier** | `cashier@servicecenter.dev` | `Cashier123!` |
| **Receptionist** | `receptionist@servicecenter.dev` | `Receptionist123!` |

*(Use the dropdown on the login screen to switch between **Downtown Service Center** and **Westside Auto Care**)*

---

### Step 3: Customer Mobile App Setup
```bash
cd "final project/mobile-app"
npm install
npm start
```
*Press `a` to open in Android Emulator, `w` to open in Web, or scan the QR code with the **Expo Go** app on your phone.*

---

### Step 4: Machine Learning Forecast Service (Optional / Local Mode)
```bash
cd "final project/inventory-ml"
pip install -r requirements.txt   # or run Setup-System.cmd
python service.py
```

---

## 📊 Inventory Demand Forecast Details & Verification

### Forecast Controls
- Select an inclusive future date range of up to 366 days, including dates beyond the history cutoff.
- Set starting stock, outstanding orders, a confirmed arrival, buffer days, and demand percentage.
- Customise weekly opening hours, holiday hours, and individual date assumptions.
- View daily expected demand, historical variation envelopes, projected shortages, and pack-rounded reorder suggestions.
- Inspect daily assumptions and export CSV. Changed inputs mark previous results stale.

### Model Performance & Evaluation
- **Algorithm:** Ridge Seasonal Regression trained on 14,000 simulated daily observations across 20 distinct automotive replacement items.
- **Locked-Test Daily Macro WAPE:** `90.83%`
- **Locked-Test Weekly Macro WAPE:** `36.71%` (Weekday baseline: `35.88%`)
- **Note:** Forecast outputs provide planning support and variation envelopes; actual historical station demand should be collected before relying exclusively on automated purchasing recommendations.

![Integrated future-date forecast](inventory-integration-preview.png)

---

## 🛡️ Multi-Tenant Data Privacy Guarantee

Each registered Service Center in Sri Lanka operates within an **isolated workspace**:
- **Financial Segregation:** Cashier and revenue records are strictly filtered by center ID.
- **Stock Confidentiality:** Inventory quantities and reorder thresholds are kept private.
- **Loyalty Program Isolation:** Loyalty points accumulated at one branch cannot be viewed or redeemed at another branch.
- **Public Directory:** Only the business name is displayed on the public portal for seamless customer discovery.

---
