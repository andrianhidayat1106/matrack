# 🚀 Matrack - Personal Daily Productivity App

**Matrack** adalah aplikasi produktivitas harian pribadi dengan antarmuka modern terinspirasi dari gaya **Odoo App Switcher** (App Launcher Grid) sebagai navigasi utama, memadukan fitur **Apple Notes** dan **Trello Schedule Kanban** yang terhubung langsung ke **Supabase** Cloud Database (Serverless Architecture).

---

## 🛠 Tech Stack & Architecture

- **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons + `@hello-pangea/dnd`
- **Database & Auth:** Supabase Cloud (PostgreSQL + Realtime Client SDK)
- **Deployment:** Vercel (1-Click Deployment)
- **Architecture:** Pure Serverless / Direct Supabase SDK Client

---

## 🎨 Navigation & UI Specifications

### 1. 🎛️ Main Dashboard: Odoo-Style App Switcher / Launcher (Default View)
- **Tampilan Utama (Default):** Antarmuka default berupa **App Launcher / Icon Grid (Gaya Odoo)** berlayar penuh dengan live digital clock, greeting, pencarian aplikasi, dan ringkasan produktivitas.
- **Elemen Grid Menu:**
  - 📝 **Notes:** Membuka modul Apple-style Notes.
  - 📅 **Schedule:** Membuka modul Trello-style Kanban Board.
  - ⚙️ **Settings:** Pengaturan akun & konfigurasi Supabase.
- **Navigasi Atas (Top Header Bar):**
  - Terdapat tombol **App Grid / Menu Icon (9-dots)** di pojok kiri atas saat membuka modul untuk kembali ke *Main App Launcher* Odoo tanpa gangguan sidebar permanen.
  - Status User & Dropdown di pojok kanan atas.

### 2. 📝 Notes Module (Apple Notes Style)
- **UI/UX:** Desain *3-column* terinspirasi dari **Apple Notes (macOS / iOS)**.
  - **Sidebar Internal Modul:** Folder/kategori & filter (All Notes, Pinned, Trash).
  - **Middle Pane:** Daftar catatan dengan pencarian cepat (*live search*), tanggal edit, dan *snippet text*.
  - **Main Content Area:** Editor teks minimalis dengan dukungan Rich Text / Markdown toolbar, hitung kata, dan auto-save instan.

### 3. 📅 Schedule & Task Module (Trello / Kanban Style)
- **UI/UX:** Tampilan papan kanban (*Kanban Board*) interaktif mirip **Trello** dengan fitur *Drag-and-Drop*.
- **Fitur Utama:**
  - Kolom status kustom (*To Do*, *In Progress*, *Done*, atau tambah kolom baru).
  - Kartu tugas dengan Judul, Deskripsi, Tanggal Jatuh Tempo (*Due Date*), dan Label Prioritas (High, Medium, Low).
  - Filter tugas berdasarkan tenggat waktu (*Today*, *Upcoming*, *Overdue*) dan prioritas.
  - Drag & Drop pemindahan kartu antar kolom dengan lancar.

---

## 🚀 Menjalankan di Lokal

1. **Install Dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan Dev Server:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173`.

---

## 🌐 Deploy ke Vercel (Gratis & 1-Klik)

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik **"Add New..."** ➡️ **"Project"** ➡️ pilih repo **`matrack`**.
3. Klik **"Deploy"** (Root directory langsung root project).
4. Selesai! Aplikasi Anda langsung live di internet.
