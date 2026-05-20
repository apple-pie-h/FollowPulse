# FollowPulse

See who doesn’t follow you back on Instagram.

A modern full-stack dashboard for analyzing Instagram export files. Upload `followers_1.json` and `following.json`, compare mutuals, find who does not follow you back, and optionally check inactive accounts with a reusable headless Chrome session.

## Tech stack

- Frontend: React + TailwindCSS + Axios
- Backend: Flask + Pandas + Selenium

## Project structure

```text
Instagram-follower-following-comparision-web-version/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── services/
│   └── storage/
├── frontend/
│   ├── package.json
│   ├── src/
│   └── public/
└── README.md
```

## Features

- Drag-and-drop upload for any two Instagram export `.json` files
- Mutual followers, followers not followed back, and following not following back
- Automatic detection of followers vs following files based on JSON structure
- Result counts in animated stat cards
- Tabbed result views
- Search, sorting, and pagination for large username lists
- Copy usernames to clipboard
- Export every result as CSV
- Download every result as plain text
- Optional deleted/inactive account checker with progress bar
- Helpful validation and Selenium error messages

## Backend setup

1. Create a virtual environment:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the Flask server:

   ```bash
   python app.py
   ```

The backend runs on `http://localhost:5000`.

## Frontend setup

1. Open another terminal:

   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5173`.

## Selenium setup notes

- The inactive-account checker expects Google Chrome and a compatible ChromeDriver on your machine.
- The backend starts one headless Chrome instance per scan job, reuses it for all usernames, adds a small delay between requests, and closes it at the end.
- If Instagram rate-limits requests, the UI surfaces that error so you can retry later.

## API endpoints

- `POST /upload`
- `POST /check-inactive`
- `GET /check-inactive/<job_id>`
- `GET /download/<type>?session_id=<id>&format=csv|txt`

## Accepted export format

- Followers exports should be a list containing `string_list_data[0].value`
- Following exports should contain `relationships_following[].title`
- After extracting Instagram data, the matching files are typically inside `connections/followers_and_following/`

## Running locally

1. Start the backend with `python app.py`
2. Start the frontend with `npm run dev`
3. Open `http://localhost:5173`
4. Upload your Instagram export files
5. Explore the tabs or start the inactive scan
