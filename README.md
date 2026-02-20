# 🛡️ Cyber-Sentinel: SOC Telemetry Pipeline

A real-time cybersecurity behavioral analytics system that captures threat mitigation events from a defense-based game and streams them into Snowflake to derive system integrity and operational performance insights using SQL.

## 🚨 Problem Statement

Modern Security Operations Centers (SOC) struggle to visualize the transition from live threats (real-time micro-events) to historical trends (analytical data). High-velocity logs often lack context regarding the severity of the phase in which a breach occurred, making it difficult to correlate game behavior with security performance metrics.

---

## 🎯 Solution

This project provides a security defense game that emits structured telemetry events (threat neutralizations, breaches, accuracy metrics) which are forwarded to a Node.js backend and ingested into Snowflake for high-level security posture analysis and performance dashboarding.

---

## 🏗️ System Architecture

```
User Interaction (Phaser Game)
        ↓
Frontend Telemetry Emitter
        ↓
Node.js Ingestion Bridge (Express API)
        ↓
Persistent Storage (game_logs.json)
        ↓
Snowflake SECURITY_LOGS Table
        ↓
SQL-based Threat Analytics
        ↓
SOC Performance Dashboard
```

---

## ⚙️ Tech Stack

| Layer         | Technology        |
|---------------|-------------------|
| Frontend      | Phaser 3, JS      |
| Backend       | Node.js, Express  |
| Data Pipeline | REST API (POST)   |
| Warehouse     | Snowflake         |
| Hosting       | Vercel, Render    |

---

## 📡 Event Streaming

Each player interaction emits a JSON event with session tracking and phase metadata. The game evolves through 6 distinct phases of threat intensity.

Example event:

```json
{
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_id": "uuid-v4-12345",
    "event_type": "threat_neutralized",
    "metadata": {
        "score": 4500,
        "phase": 3
    },
    "timestamp": "2026-02-20T10:23:45Z"
}
```

Send events to the backend with a POST request (example using curl):

```bash
curl -X POST http://localhost:3000/event \
    -H "Content-Type: application/json" \
    -d '{"event_type":"threat_neutralized","metadata":{"score":4500,"phase":3},"timestamp":"2026-02-20T10:23:45Z"}'
```

Events are stored in Snowflake at `BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS`.

---

## 📊 Example Snowflake Queries

**Critical Breach Ratio (Breaches vs. Total Threats):**

```sql
SELECT 
    ROUND(COUNT_IF(event_type = 'security_breach') * 100.0 / COUNT(*), 2) AS breach_ratio_pct
FROM BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS;
```

**System Integrity Index (Calculated via SQL):**

```sql
SELECT 
    session_id,
    100 - (COUNT_IF(event_type = 'security_breach') * 10) + 
    (COUNT_IF(event_type = 'threat_neutralized') * 2) AS final_integrity_index
FROM BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS
GROUP BY session_id;
```

**Average Accuracy by Phase:**

```sql
SELECT 
    metadata:phase AS phase,
    ROUND(AVG(
        CASE WHEN event_type = 'threat_neutralized' 
        THEN 1 ELSE 0 END * 100
    ), 2) AS accuracy_pct
FROM BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS
GROUP BY phase
ORDER BY phase;
```

---

## 🚀 Live Demo & Repository

- **Game**: https://cyber-sentinel.vercel.app/
- **SOC Dashboard**: https://cyber-sentinel-api.onrender.com/stats
- **GitHub**: https://github.com/yourusername/cyber-sentinel

---

## 🛠️ Local Setup

1) **Clone the repository**

```bash
git clone https://github.com/yourusername/cyber-sentinel.git
cd cyber-sentinel
```

2) **Install root dependencies**

```bash
npm install
```

3) **Backend setup**

```bash
cd data-bridge
npm install
node server.js
```

4) **Frontend setup**

```bash
cd game-client
npm install
npm run dev
```

5) **Snowflake setup** (create these objects in your Snowflake account):

```sql
CREATE DATABASE IF NOT EXISTS BUILDATHON_DB;
CREATE SCHEMA IF NOT EXISTS BUILDATHON_DB.GAME_SCHEMA;
CREATE TABLE IF NOT EXISTS BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS (
    event_id STRING,
    session_id STRING,
    event_type STRING,
    timestamp TIMESTAMP_NTZ,
    metadata VARIANT
);
```

6) **Verify data ingestion**

```sql
SELECT * FROM BUILDATHON_DB.GAME_SCHEMA.SECURITY_LOGS LIMIT 100;
```

---

## 🏁 Notes

- This project demonstrates an event-driven architecture with real-time streaming into Snowflake and SQL-based behavioral analytics for security performance measurement.
- The game features 6 adaptive threat phases (P1-P6) with escalating difficulty tied to player performance.
- Data is simultaneously used for in-game HUD updates and long-term Snowflake warehouse storage.
- Designed specifically for the Snowflake Developer Buildathon 2026.