# 📝 TODO App - Production-Ready Task Management

<div align="center">

![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**A fully-featured, offline-capable task management app with cloud sync**

[📥 Download APK](https://drive.google.com/file/d/17JqTwwYvSMaERp9il-ouzTSrEHb1jIOG/view?usp=drivesdk) • [� Features](#features) • [� Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 🔐 **Authentication**
- **Google OAuth** integration via Clerk
- Secure token storage with expo-secure-store
- Protected routes (no unauthorized access)
- Smooth OAuth callback handling

### 📊 **Task Management**
- ✅ Create, edit, and delete todos
- ✅ Mark tasks as complete/incomplete
- ✅ Organize tasks into custom groups
- ✅ Rich descriptions for detailed notes
- ✅ Real-time updates across devices

### 📁 **Task Groups**
- Create unlimited custom groups (Work, Personal, Study, etc.)
- Rename groups inline
- Delete groups (with warning)
- Visual group organization
- Required group assignment for all tasks

### 🎯 **Smart Sorting**
- **Automatic sorting within groups:**
  1. Incomplete tasks shown first
  2. Then sorted by creation date (newest on top)
- Clean, organized interface
- No manual sorting needed

### 💾 **Offline Mode + Cloud Sync**
- **Full offline functionality** - works without internet
- Local SQLite database for fast access
- Automatic background sync when online
- Smart conflict resolution (latest update wins)
- Visual offline indicator
- Queue-based sync system

### 🎨 **UI/UX**
- Clean, minimal iOS-style design
- Smooth animations and transitions
- Intuitive touch interactions
- Loading states and feedback
- Responsive layout for all screen sizes
- Native icons and components

---

## 📱 APK Download

### **Android APK (Direct Install)**
📥 **[Download TODO App APK](https://drive.google.com/file/d/17JqTwwYvSMaERp9il-ouzTSrEHb1jIOG/view?usp=drivesdk)**

**Installation Steps:**
1. Download APK from link above
2. Enable "Install from Unknown Sources" in Android settings
3. Open downloaded APK file
4. Tap "Install"
5. Open app and sign in with Google

**Requirements:**
- Android 5.0 (Lollipop) or higher
- ~50 MB storage space
- Internet connection for initial setup

---

## 🛠 Tech Stack

### **Frontend**
- **React Native** 0.81.5 - Cross-platform mobile framework
- **Expo** 54 - Development toolchain and SDK
- **Expo Router** 6 - File-based routing system
- **JavaScript ES6+** - Modern JavaScript features

### **Authentication**
- **Clerk** - User authentication and management
- **@clerk/clerk-expo** 2.17.1 - Clerk React Native SDK
- **expo-secure-store** - Encrypted token storage

### **Database**
- **Supabase** - PostgreSQL cloud database
- **@supabase/supabase-js** 2.77.0 - Supabase client
- **expo-sqlite** 16.0.8 - Local SQLite storage

### **Networking & State**
- **@react-native-community/netinfo** 11.4.1 - Network status
- **expo-crypto** - Secure UUID generation
- Custom sync manager with queue system

### **UI Components**
- React Native Core Components
- @expo/vector-icons (Ionicons)
- React Navigation

---

## � Quick Start

```bash
# Install dependencies
npm install

# Configure .env file with Clerk and Supabase credentials
# EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Start development server
npm start
```

---

## 🗄 Database Schema

### **groups** table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (UUID v4) |
| `user_id` | text | Foreign key to Clerk user |
| `name` | text | Group name |
| `created_at` | timestamp | Creation timestamp |

### **todos** table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (UUID v4) |
| `user_id` | text | Foreign key to Clerk user |
| `group_id` | uuid | Foreign key to groups.id |
| `title` | text | Task title (required) |
| `description` | text | Optional detailed description |
| `is_completed` | boolean | Completion status |
| `created_at` | timestamp | Creation timestamp |

---

## 🏗 Architecture

**Offline-First Design**
- Local SQLite database for instant responses
- Queue-based sync system with conflict resolution
- Automatic background sync when online

**Tech Highlights**
- File-based routing with Expo Router
- Clerk authentication with OAuth 2.0
- Supabase PostgreSQL with RLS policies
- React Native Core Components

---

---

<div align="center">

**Built with ❤️ using React Native + Expo**

[📥 Download APK](https://drive.google.com/file/d/17JqTwwYvSMaERp9il-ouzTSrEHb1jIOG/view?usp=drivesdk)

</div>
