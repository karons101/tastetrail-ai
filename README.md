# TasteTrail AI

**Discover your next favorite movie through an interactive, Qloo-powered exploration journey.**

TasteTrail AI is a movie discovery web application that helps users find movies and explore related recommendations. Instead of ending with a single recommendation list, users can select a recommended movie and continue exploring from there.

**Live Demo:** https://tastetrail-ai.onrender.com  
**GitHub Repository:** https://github.com/karons101/tastetrail-ai

## The Problem

Finding a movie worth watching can be difficult when conventional search requires users to know exactly what they want. TasteTrail AI provides an exploratory alternative: start with a movie you know, discover related titles, and follow your interests to find your next watch.

## The Solution

TasteTrail AI combines movie search with Qloo's API to support an iterative discovery experience. Users can search for a movie, request recommendations, explore a recommendation as the next starting point, and maintain a discovery journey across page refreshes.

## Features

- **Movie search:** Search for movies using Qloo's entity search.
- **Qloo-powered recommendations:** Retrieve related movie recommendations through Qloo Insights.
- **Iterative discovery:** Explore a recommended movie to generate another recommendation list.
- **Persistent discovery journey:** Keep track of explored movies across page refreshes using browser local storage.
- **Journey management:** Clear the saved discovery journey when starting fresh.
- **Responsive interface:** Explore movies through a browser-based interface.

## How It Works

1. Search for a movie, such as *Interstellar*.
2. Select a matching search result.
3. TasteTrail AI sends the selected entity to Qloo Insights.
4. Review the returned recommendations.
5. Select **Explore this movie** on a recommendation to continue the discovery process.
6. Review your discovery journey, refresh the page, or clear the journey when you want to start over.

Recommendation affinity scores, when provided by Qloo, are ranking signals; they should not be interpreted as probabilities that a user will enjoy a movie.

## Technology Stack

- **Runtime:** Node.js
- **Backend:** Express
- **Frontend:** HTML, CSS, and JavaScript
- **Discovery data:** Qloo API, including Search and Insights endpoints
- **Configuration:** Environment variables managed with dotenv
- **Deployment:** Render
- **Version control:** Git and GitHub

## Architecture

The application uses a lightweight client-server architecture.

- The frontend in `public/` provides the search interface, recommendation cards, and discovery journey.
- `server.js` serves the application and exposes backend endpoints that communicate with Qloo.
- `/api/qloo-search` searches Qloo entities.
- `/api/qloo-test` retrieves recommendations for a selected entity through Qloo Insights.
- The frontend calls the application backend rather than exposing the Qloo API key in browser code.

The discovery journey is stored in the user's browser using local storage. It is not currently a cross-device or account-synchronized history.

## Run Locally

### Prerequisites

- Node.js and npm
- A Qloo API key with access to the required API endpoints

### 1. Clone the repository

```bash
git clone https://github.com/karons101/tastetrail-ai.git
cd tastetrail-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the API key

Create a `.env` file in the project root:

```env
QLOO_API_KEY=your_qloo_api_key_here
```

Replace the placeholder with your actual Qloo API key. Never commit `.env` or expose the key in frontend code.

### 4. Start the server

```bash
node server.js
```

Open http://localhost:3000 in your browser.

## Environment Configuration

| Variable | Purpose |
|---|---|
| `QLOO_API_KEY` | Authenticates server-side requests to Qloo |
| `PORT` | Optional server port; defaults to `3000` when not provided |

For deployment, configure `QLOO_API_KEY` through the hosting provider's environment-variable settings.

## Current Scope and Limitations

TasteTrail AI currently focuses on movie search, Qloo-powered recommendations, iterative exploration, and a browser-persisted discovery journey.

- Recommendation quality and available metadata depend on Qloo's responses.
- The discovery journey is stored locally in the browser and is not synchronized between devices.
- The current application does not require a separate LLM API key for its discovery workflow.
- Account-based personalization, cross-device history, and other future enhancements are outside the current MVP scope.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgements

Thanks to Qloo for providing the API used to power TasteTrail AI's discovery experience.
