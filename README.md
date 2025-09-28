# SplitEase - Expense Tracking App

A comprehensive expense tracking application built with React, TypeScript, Tailwind CSS, and Supabase backend.

## ✨ Features

### 🔐 Complete Authentication System
- **Email/Password Authentication**: Secure user registration and login
- **Password Reset**: Users receive email with secure reset link (no redirect to login page)
- **Protected Routes**: Automatic authentication checks and redirects
- **User Profiles**: Automatic profile creation with user metadata

### 💰 Smart Expense Management
- **Group Creation**: Create expense groups for families, trips, roommates
- **Advanced Expense Tracking**: Track who paid what amounts upfront
- **Intelligent Bill Splitting**: Split remaining amounts equally or custom amounts
- **Payment History**: Complete payment tracking and history
- **Real-time Updates**: Live updates when expenses or payments change

### 📧 Email Notification System
- **Payment Reminders**: Send email reminders with outstanding amounts
- **Payment Links**: Include payment links in reminder emails
- **Custom Templates**: Professional email templates with expense details
- **Bulk Notifications**: Send reminders to multiple members

### 👥 Flexible Membership
- **Registered Users**: Full features for signed-up users
- **Guest Members**: Add members by name/email without registration
- **Member Management**: Add/remove members, track participation

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, Edge Functions)
- **Email Service**: Resend API for transactional emails
- **Real-time**: Supabase real-time subscriptions
- **State Management**: React Context API
- **Routing**: React Router DOM

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier available)
- Resend account for emails (free tier available)

### 1. Clone and Install
```bash
git clone https://github.com/your-repo/splitease.git
cd splitease
npm install
