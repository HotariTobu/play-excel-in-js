# Play Excel in JS

A playground for manipulating Excel files using JavaScript libraries. This project demonstrates how to work with Excel files in a web environment using ExcelJS and XLSX libraries.

## Features

- **ExcelJS Integration**: Advanced Excel file manipulation with formatting support
- **XLSX Integration**: Lightweight Excel file reading and writing
- **File Upload/Download**: Interactive file handling
- **Modern UI**: Built with Next.js, React, and Tailwind CSS

## Tech Stack

- Next.js 15.4.6
- React 19.1.0
- TypeScript
- Tailwind CSS
- ExcelJS
- XLSX

## Getting Started

### Prerequisites

Make sure you have Node.js (version 18 or higher) installed on your machine.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd play-excel-in-js
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
bun install
```

### Running the Development Server

Start the development server with Turbopack:

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The server will start on [http://localhost:3000](http://localhost:3000).

### Accessing the Application

Once the server is running, you can access the following pages:

- **Home Page**: [http://localhost:3000](http://localhost:3000)
- **ExcelJS Playground**: [http://localhost:3000/exceljs](http://localhost:3000/exceljs)
- **XLSX Playground**: [http://localhost:3000/xlsx](http://localhost:3000/xlsx)

### Building for Production

To create a production build:

```bash
npm run build
npm run start
```

The production server will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Run Biome linting
- `npm run fix` - Fix linting issues automatically

## Project Structure

```
src/
├── app/
│   ├── (with-header)/
│   │   ├── exceljs/        # ExcelJS playground page
│   │   └── xlsx/           # XLSX playground page
│   └── (without-header)/   # Home page
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
