SplitEase – Smart Group Expense Tracker

SplitEase is a smart group expense tracker that makes it easy to manage shared expenses with friends, family, or roommates. It automatically calculates each person’s share, provides balance summaries, and sends reminders to settle payments.

🚀 Features

💰 Group Expense Management – Create groups and add shared expenses.

🔄 Auto-Split Logic – Automatically split bills among group members.

📊 Balance Summaries – View who owes whom and how much.

✉️ Email Reminders – Notify members to settle their dues.

📱 Seamless Payment Redirects – Quick links to payment apps.

🔒 Secure Data Handling – User authentication & data security.

🛠 Tech Stack

Frontend: React.js (Vite, ShadCN UI, TailwindCSS)

Backend: Node.js + Express / Flask (choose depending on final build)

Database: MongoDB / PostgreSQL

Authentication: Supabase / Firebase / JWT

Deployment: Vercel / Netlify (frontend), Render / Heroku / AWS (backend)

📂 Project Structure
SplitEase/
│── client/          # React frontend (Vite)
│── server/          # Backend API
│── database/        # DB schema & migrations
│── docs/            # Documentation & design files
│── README.md        # Project documentation

⚡ Getting Started
1. Clone the Repository
git clone https://github.com/your-username/splitease.git
cd splitease

2. Setup Frontend
cd client
npm install
npm run dev

3. Setup Backend
cd server
npm install
npm start

4. Environment Variables

Create a .env file in both client and server with values like:

DATABASE_URL=your_database_url
SUPABASE_KEY=your_supabase_key
EMAIL_SERVICE_API_KEY=your_email_api_key

5. Run Application

Start frontend and backend together:

npm run dev

📸 Screenshots

Soon...........

🤝 Contribution

Contributions are welcome! To contribute:

Fork this repository

Create a new branch (feature/awesome-feature)

Commit your changes

Push the branch and create a Pull Request

📜 License

This project is licensed under the MIT License.
