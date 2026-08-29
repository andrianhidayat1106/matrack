# 🚀 Matrack - Personal Daily Productivity App

**Matrack** adalah aplikasi produktivitas harian pribadi dengan antarmuka modern terinspirasi dari gaya **Odoo App Switcher** (App Launcher Grid) sebagai navigasi utama, memadukan fitur **Apple Notes** dan **Trello Schedule** dalam satu platform terpadu.

---

## 🛠 Tech Stack & Architecture

- **Backend:** Laravel 11 (Stateless RESTful API + Laravel Sanctum)
- **Frontend:** React (Vite / Next.js) + Tailwind CSS + Lucide Icons
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Token-based Auth (Login/Register tanpa role/RBAC)

---

## 🎨 Navigation & UI Specifications

### 1. 🎛️ Main Dashboard: Odoo-Style App Switcher / Launcher (Default View)
- **Tampilan Utama (Default):** Saat user login, antarmuka default berupa **App Launcher / Icon Grid (Gaya Odoo)** berlayar penuh / berlatar elegan (dark/clean theme).
- **Elemen Grid Menu:**
  - 📝 **Notes:** Membuka modul Apple-style Notes.
  - 📅 **Schedule:** Membuka modul Trello-style Kanban Board.
  - ⚙️ **Settings / Account:** Pengaturan akun sederhana.
- **Navigasi Atas (Top Header Bar):**
  - Terdapat tombol **App Grid / Menu Icon** di pojok kiri atas saat membuka modul (Notes/Schedule) untuk kembali ke *Main App Launcher* Odoo tanpa gangguan sidebar permanen.
  - Status User / Logout di pojok kanan atas.

### 2. 🔐 Authentication & Security
- Register (Name, Email, Password) & Login.
- Authentication menggunakan Token (Laravel Sanctum).
- Isolasi Data: Setiap user hanya dapat melihat dan mengelola data miliknya sendiri.

### 3. 📝 Notes Module (Apple Notes Style)
- **UI/UX:** Desain *multi-column* terinspirasi dari **Apple Notes (macOS / iOS)**.
  - **Sidebar Internal Modul:** Folder/kategori & filter (All Notes, Pinned, Trash).
  - **Middle Pane:** Daftar catatan dengan pencarian cepat (*live search*), tanggal edit, dan *snippet text*.
  - **Main Content Area:** Editor teks minimalis dengan dukungan Rich Text / Markdown.
- **Fitur Utama:**
  - Auto-save draf saat mengetik.
  - Pin/Unpin catatan ke bagian paling atas.
  - Cari catatan berdasarkan judul atau isi teks.
  - Arsip / Sampah (*Trash*).

### 4. 📅 Schedule & Task Module (Trello / Kanban Style)
- **UI/UX:** Tampilan papan kanban (*Kanban Board*) interaktif mirip **Trello** dengan fitur *Drag-and-Drop*.
- **Fitur Utama:**
  - Kolom status kustom (misal: *To Do*, *In Progress*, *Done*).
  - Kartu tugas dengan Judul, Deskripsi, Tanggal Jatuh Tempo (*Due Date*), dan Label Prioritas.
  - Filter tugas berdasarkan tenggat waktu (*Today*, *Upcoming*, *Overdue*).
  - Pemindahan kartu antar kolom dengan lancar.

---

## 🗄 Database Schema (Supabase / PostgreSQL)

Aplikasi ini menggunakan struktur tabel berikut:

1. **`users`**
   - `id`, `name`, `email`, `password`, `created_at`, `updated_at`
2. **`notes`**
   - `id`, `user_id` (FK), `title`, `content`, `is_pinned` (boolean), `is_archived` (boolean), `timestamps`
3. **`boards`**
   - `id`, `user_id` (FK), `name`, `timestamps`
4. **`columns`**
   - `id`, `board_id` (FK), `name`, `position` (integer), `timestamps`
5. **`tasks`**
   - `id`, `column_id` (FK), `user_id` (FK), `title`, `description`, `due_date` (dateTime), `priority` (enum: low, medium, high), `position` (integer), `timestamps`

---

## 🚀 Prompt / Instructions for Antigravity AI

> Copy and paste the prompt below into **Antigravity** to execute code generation:

```text
Project Name: Matrack
Role: Full-Stack Developer AI Agent

Please build the "Matrack" application based on the requirements stated in this README file.

### Key Layout Instruction (Odoo-Style Navigation):
- Do NOT use a permanent left sidebar for main app navigation.
- Implement an **Odoo-Style App Switcher / Grid View** as the default main screen upon login.
- Users click an app tile (e.g. Notes, Schedule) from the grid to open that specific module.
- Inside any module, place an App Grid icon button on the top-left navigation bar so the user can easily return to the Odoo Home App Launcher.

### Required Code Tasks:
1. **Laravel 11 Backend API:**
   - Setup Laravel 11 with PostgreSQL connection configured for Supabase.
   - Install and configure Laravel Sanctum for API token authentication.
   - Create Database Migrations, Models, Controllers, and Resource Routers for:
     - Auth (`/api/register`, `/api/login`, `/api/logout`, `/api/me`)
     - Notes CRUD (`/api/notes`, `/api/notes/{id}/pin`, etc.)
     - Board/Schedule CRUD (`/api/boards`, `/api/columns`, `/api/tasks`)
   - Ensure all queries scope data strictly to `auth()->user()->id`.

2. **React Frontend (Vite + Tailwind CSS):**
   - **Odoo Dashboard Component:** Build a clean App Grid menu component displaying colorful app icons (Notes, Schedule, Settings).
   - **Notes Component:** Apple Notes layout (Internal sidebar, note list, rich text area) with live search and pin action.
   - **Schedule Component:** Trello-like Kanban board with date pickers, priority tags, and drag-and-drop support.
   - Integrate API calls using Axios/Fetch with Authorization header tokens.

3. **Supabase Setup Guidance:**
   - Provide clear instructions for `.env` credentials mapping (DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD).