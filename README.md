<div align="center">
<img width="1200" height="475" alt="Hope Canteen System Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hope Canteen System

A modern digital canteen management system for schools, built with React, TypeScript, Vite, Supabase, and Gemini AI.

## Features

- **Student Dashboard**: Browse menu, place orders, and track order status
- **Staff POS (Point of Sale)**: Efficient order processing and management
- **Admin Dashboard**: Oversee operations, manage users, and view analytics
- **QR Code Integration**: Secure order verification and tracking
- **AI-Powered Assistance**: Intelligent menu suggestions and order recommendations using Gemini AI
- **Real-time Notifications**: Live updates on order status

## Prerequisites

- Node.js (version 18 or higher)
- Supabase account for backend services
- Gemini API key for AI features

## Installation

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd hope-canteen-system
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env.local` file in the root directory with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**:

   - Create a new project in Supabase
   - Run the SQL scripts in the `supabase/` directory to set up tables, permissions, and functions
   - Update your environment variables with the correct Supabase URL and keys

## Running Locally

Start the development server:
```
npm run dev
```

The app will be available at `http://localhost:5173` by default.

## Building for Production

Build the app for production:
```
npm run build
```

The build output will be in the `dist/` directory.

## Supabase Functions

The project includes Supabase Edge Functions for backend logic. Deploy them using:
```
supabase functions deploy
```

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **AI**: Google Gemini API
- **Styling**: CSS modules and component-based styling
- **QR Codes**: QR code generation for secure orders

## Project Structure

- `components/`: Reusable React components
- `pages/`: Main application pages (Admin, Staff, Student)
- `services/`: API integrations (Supabase, Gemini, Storage)
- `supabase/`: Database schemas, migrations, and edge functions
- `types.ts`: TypeScript type definitions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.
