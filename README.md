# 🌍 Clean Air Accountability Tracker

A web-based environmental monitoring and accountability platform designed to track air quality, visualize pollution data, and bring transparency to clean-air initiatives.

The project combines air-quality data visualization with structured environmental action plans to make pollution-related information easier to understand and monitor.

## 🚀 Features

- 🌫️ **Air Quality Monitoring** – Access air-quality information through the WAQI API.
- 📊 **Interactive Visualizations** – Visualize environmental data using Chart.js.
- 🌱 **Clean Air Action Plans** – Explore 102 action plans organized across 4 major pillars.
- 📈 **Environmental Accountability** – Present pollution-control initiatives in a structured format.
- 📱 **Responsive UI** – Modern interface designed for accessibility.

## 🛠️ Tech Stack

| Technology   | Purpose               |
| ------------ | --------------------- |
| HTML         | Structure             |
| CSS          | Styling               |
| JavaScript   | Application logic     |
| Tailwind CSS | Utility-first styling |
| DaisyUI      | UI components         |
| Chart.js     | Data visualization    |
| WAQI API     | Air quality data      |

## 📊 Project Overview

The platform focuses on four major pillars and 102 clean-air action plans.

Its primary objectives are:

- Make air-quality information accessible.
- Present environmental data through interactive charts.
- Organize pollution-control initiatives.
- Promote transparency and environmental accountability.

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/anubhavjha007/clean-air-tracker.git
```

### 2. Navigate to the project

```bash
cd clean-air-tracker
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory:

```env
VITE_WAQI_TOKEN=your_api_token_here
```

Get an API token from [WAQI API](https://aqicn.org/api/).

**Important:** Never upload your actual API keys or `.env` file to GitHub.

### 5. Run the development server

```bash
npm run dev
```

Open the localhost URL displayed in your terminal.

## 🔑 Data Source

Air-quality information is integrated using the [World Air Quality Index (WAQI)](https://aqicn.org/api/) API.

A valid API token is required for live data access.

## 🔮 Future Improvements

- Real-time AQI monitoring across multiple locations.
- Historical pollution trend analysis.
- PM2.5, PM10 and other pollutant-level monitoring.
- Location-based pollution alerts.
- Database integration for historical records.
- Action-plan implementation and progress tracking.

## 👨‍💻 Developer

**Anubhav Jha**

- GitHub: [@anubhavjha007](https://github.com/anubhavjha007)&#x20;
- Project Repository: [Clean Air Tracker](https://github.com/anubhavjha007/clean-air-tracker)

## 📄 License

Developed for educational and environmental awareness purposes.

---

🌱 **Building technology for a cleaner and more accountable future.**
