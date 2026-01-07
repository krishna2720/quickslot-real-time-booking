🚀 QuickSlot – Real-Time Booking System

Live Demo:
👉 https://quickslot-real-time-booking-wheat.vercel.app

QuickSlot is a real-time slot booking web application that allows users to view available providers, check live time (UTC-based), and book slots instantly.
The system uses UTC clock synchronization to avoid time mismatch issues and localStorage to simulate real-time booking persistence.

📌 Features

⏱ UTC-Based Real-Time Clock
Ensures consistent time across all users regardless of location.

📅 Live Slot Booking
Book available slots instantly with real-time UI updates.

💾 LocalStorage Persistence
Booked slots remain saved even after page refresh.

👨‍⚕️ Provider Selection System
Users can choose from multiple providers dynamically.

🔄 Instant UI Synchronization
Slot availability updates without manual refresh.

🌐 Deployed on Vercel
Fast, reliable, and production-ready deployment.

How It Works ??? 

1.The system fetches current UTC time.

2.Available slots are generated based on the selected provider.

3.Once a slot is booked:

4.It gets stored in localStorage

5.UI updates instantly

6.Already booked slots are disabled to prevent double booking

