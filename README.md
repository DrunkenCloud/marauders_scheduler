# College Schedule Maker

A web-based application for managing college schedules and timetables with admin authentication and comprehensive entity management.

## Features

- **Admin Authentication**: Secure login system with role-based access
- **Entity Management**: Complete CRUD operations for students, faculty, halls, courses, and groups
- **Timetable Management**: Slot-based scheduling with flexible duration support
- **Group Operations**: Group timetable creation with member inheritance and exceptions
- **Session Management**: Multi-session support with data copying capabilities

## Tech Stack

- **Frontend**: Next.js 15 with React and TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Session-based authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the `DATABASE_URL` with your PostgreSQL connection string.

4. Generate Prisma client:
   ```bash
   pnpm run db:generate
   ```

5. Run database migrations:
   ```bash
   pnpm run db:migrate
   ```

6. Start the development server:
   ```bash
   pnpm run dev
   ```

The application will be available at `http://localhost:3000`.

## Database Schema

The application uses the following main entities:
- **Sessions**: Academic sessions with timing constraints
- **Students**: Individual students with timetables
- **Faculty**: Teaching staff with schedules
- **Halls**: Physical spaces for classes
- **Courses**: Academic courses with scheduling requirements
- **Groups**: Collections of students, faculty, or halls

## Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run db:generate` - Generate Prisma client
- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:studio` - Open Prisma Studio

### Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility libraries
└── types/              # TypeScript type definitions
```

## Authentication

Default admin credentials:
- Username: `admin`
- Password: `password`

## License

ISC