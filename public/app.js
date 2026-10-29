/**
 * TasteTrail AI — Frontend Application
 *
 * Responsibilities:
 * 1. Search for movies using the local Qloo API proxy.
 * 2. Display searchable movie results with posters and metadata.
 * 3. Feature the selected movie above its recommendations.
 * 4. Retrieve and render personalized recommendations from Qloo.
 * 5. Allow users to explore recommendations recursively.
 * 6. Prevent stale asynchronous requests from overwriting newer results.
 *
 * All API requests use the application's own backend endpoints.
 * Qloo credentials must remain on the server and never appear here.
 */

"use strict";

const searchForm = document.getElementById("movie-search-form");
const searchInput = document.getElementById("movie-query");
const searchResults = document.getElementById("search-results");
const recommendationsContainer = document.getElementById(
    "recommendations"
);
const recommendationsTitle = document.getElementById(
    "recommendationsTitle"
);

let activeRequestToken = 0;

// Discovery Journey: records movies explored during the current session.

const JOURNEY_STORAGE_KEY = "tastetrail-discovery-journey";

/**
 * Restore the saved discovery journey from localStorage.
 * Invalid entries and duplicate movie IDs are ignored.
 */
function restoreDiscoveryJourney() {
    try {
        const savedJourney = localStorage.getItem(JOURNEY_STORAGE_KEY);

        if (!savedJourney) {
            return [];
        }

        const parsedJourney = JSON.parse(savedJourney);

        if (!Array.isArray(parsedJourney)) {
            return [];
        }

        const uniqueMovies = [];
        const seenIds = new Set();

        for (const movie of parsedJourney) {
            if (
                !movie ||
                typeof movie.id !== "string" ||
                typeof movie.name !== "string" ||
                !movie.id.trim() ||
                !movie.name.trim() ||
                seenIds.has(movie.id)
            ) {
                continue;
            }

            seenIds.add(movie.id);

            uniqueMovies.push({
                id: movie.id,
                name: movie.name
            });
        }

        return uniqueMovies;
    } catch (error) {
        console.warn(
            "Could not restore the discovery journey.",
            error
        );

        return [];
    }
}

const discoveryJourney = restoreDiscoveryJourney();

const journeySection = document.getElementById("discovery-journey");
const journeyTrail = document.getElementById("journey-trail");
const clearJourneyButton = document.getElementById("clear-journey");

/**
 * Render the journey and save its current state.
 * Saving here ensures additions and clearing are persisted.
 */
function renderDiscoveryJourney() {
    if (!journeySection || !journeyTrail) {
        return;
    }

    journeyTrail.replaceChildren();

    discoveryJourney.forEach((movie, index) => {
        const item = document.createElement("li");
        item.className = "journey-item";

        const title = document.createElement("span");
        title.textContent = movie.name;

        item.appendChild(title);

        if (index < discoveryJourney.length - 1) {
            const arrow = document.createElement("span");
            arrow.className = "journey-arrow";
            arrow.textContent = "→";
            arrow.setAttribute("aria-hidden", "true");

            item.appendChild(arrow);
        }

        journeyTrail.appendChild(item);
    });

    journeySection.hidden = discoveryJourney.length === 0;

    // Persist the journey whenever it changes.
    try {
        localStorage.setItem(
            JOURNEY_STORAGE_KEY,
            JSON.stringify(discoveryJourney)
        );
    } catch (error) {
        console.warn(
            "Could not save the discovery journey.",
            error
        );
    }
}

/**
 * Add a movie to the journey if it has not already been recorded.
 */
function recordJourneyMovie(movie) {
    const id = getEntityId(movie);
    const name = getMovieName(movie).trim();

    if (!id || !name || name === "Untitled movie") {
        return;
    }

    if (discoveryJourney.some((item) => item.id === id)) {
        return;
    }

    discoveryJourney.push({
        id,
        name
    });

    renderDiscoveryJourney();
}

// Clear the journey and persist the empty state.
if (clearJourneyButton) {
    clearJourneyButton.addEventListener("click", () => {
        discoveryJourney.length = 0;
        renderDiscoveryJourney();
    });
}

// Restore the saved journey visibly when the page first loads.
renderDiscoveryJourney();

/**
 * Add the selected-movie section and supporting styles.
 * This keeps the existing HTML structure usable.
 */
function initializeFeaturedMovieSection() {
    if (!document.getElementById("featuredMovieStyles")) {
        const style = document.createElement("style");
        style.id = "featuredMovieStyles";

        style.textContent = `
            .featured-movie {
                display: grid;
                grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
                gap: 24px;
                align-items: start;
                margin: 28px 0;
                padding: 24px;
                border: 1px solid rgba(182, 243, 107, 0.25);
                border-radius: 18px;
                background: var(--surface, #191b29);
                scroll-margin-top: 24px;
            }

            .featured-movie-poster {
                display: block;
                width: 100%;
                max-width: 220px;
                aspect-ratio: 2 / 3;
                object-fit: cover;
                border-radius: 12px;
                background: var(--surface-raised, #222438);
            }

            .featured-movie h2 {
                margin-top: 0;
                margin-bottom: 12px;
            }

            .featured-movie p {
                line-height: 1.7;
            }

            .featured-movie-label {
                margin-bottom: 10px;
                color: var(--accent, #b6f36b);
                font-size: 0.78rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            .featured-movie-no-poster {
                grid-template-columns: minmax(0, 1fr);
            }

            .recommendation-card button,
            .movie-result button {
                cursor: pointer;
            }

            .explore-movie-button {
                margin-top: 12px;
                padding: 10px 15px;
                border: 0;
                border-radius: 9px;
                background: var(--accent, #b6f36b);
                color: #10111b;
                font-weight: 700;
            }

            .explore-movie-button:hover {
                filter: brightness(1.08);
            }

            .movie-result img {
                max-width: 150px;
                height: 200px;
                object-fit: cover;
            }

            @media (max-width: 600px) {
                .featured-movie {
                    grid-template-columns: minmax(0, 1fr);
                    gap: 18px;
                    padding: 18px;
                }

                .featured-movie-poster {
                    max-width: 180px;
                }

                .movie-result img {
                    max-width: 135px;
                    height: 180px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    if (!document.getElementById("featuredMovie")) {
        const featuredSection = document.createElement("section");
        featuredSection.id = "featuredMovie";
        featuredSection.setAttribute("aria-live", "polite");

        if (recommendationsTitle && recommendationsTitle.parentNode) {
            recommendationsTitle.parentNode.insertBefore(
                featuredSection,
                recommendationsTitle
            );
        } else if (recommendationsContainer?.parentNode) {
            recommendationsContainer.parentNode.insertBefore(
                featuredSection,
                recommendationsContainer
            );
        } else {
            document.body.appendChild(featuredSection);
        }
    }
}

initializeFeaturedMovieSection();

/**
 * Safely retrieve an entity identifier from different Qloo response shapes.
 */
function getEntityId(movie) {
    return (
        movie?.entity_id ||
        movie?.entityId ||
        movie?.id ||
        movie?.properties?.entity_id ||
        ""
    );
}

/**
 * Retrieve a readable movie title from a Qloo entity.
 */
function getMovieName(movie) {
    return (
        movie?.name ||
        movie?.title ||
        movie?.properties?.name ||
        "Untitled movie"
    );
}

/**
 * Retrieve a movie's poster URL when available.
 */
function getMoviePoster(movie) {
    return (
        movie?.properties?.image?.url ||
        movie?.image?.url ||
        movie?.properties?.poster_url ||
        movie?.poster_url ||
        ""
    );
}

/**
 * Retrieve a movie's release year when available.
 */
function getMovieYear(movie) {
    const year =
        movie?.properties?.release_year ||
        movie?.release_year ||
        movie?.properties?.year ||
        "";

    return year ? String(year) : "";
}

/**
 * Retrieve a description or useful disambiguation text.
 */
function getMovieDescription(movie) {
    const properties = movie?.properties || {};

    const description =
        properties.description ||
        properties.short_description ||
        properties.short_descriptions?.[0] ||
        movie?.description ||
        "";

    if (typeof description === "string" && description.trim()) {
        return description.trim();
    }

    const disambiguation =
        properties.disambiguation ||
        movie?.disambiguation ||
        "";

    if (typeof disambiguation === "string" && disambiguation.trim()) {
        return disambiguation.trim();
    }

    return "Explore this movie and discover films that match its taste profile.";
}

/**
 * Scroll to the selected movie section.
 */
function scrollToFeaturedMovie() {
    const featuredSection = document.getElementById("featuredMovie");

    if (featuredSection) {
        featuredSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

/**
 * Display a status message without interpreting it as HTML.
 */
function showStatus(container, message) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    container.appendChild(paragraph);
}

/**
 * Display the selected movie above its recommendations.
 */
async function renderFeaturedMovie(movie, requestToken) {
    const featuredSection = document.getElementById("featuredMovie");

    if (!featuredSection) {
        return;
    }

    featuredSection.replaceChildren();

    const panel = document.createElement("div");
    panel.className = "featured-movie";

    const posterUrl = getMoviePoster(movie);
    const title = getMovieName(movie);
    const year = getMovieYear(movie);
    const description = getMovieDescription(movie);

    if (posterUrl) {
        const poster = document.createElement("img");
        poster.className = "featured-movie-poster";
        poster.src = posterUrl;
        poster.alt = `${title} movie poster`;
        poster.loading = "lazy";

        poster.addEventListener("error", () => {
            poster.remove();
            panel.classList.add("featured-movie-no-poster");
        });

        panel.appendChild(poster);
    } else {
        panel.classList.add("featured-movie-no-poster");
    }

    const details = document.createElement("div");

    const label = document.createElement("div");
    label.className = "featured-movie-label";
    label.textContent = "Your selected movie";

    const heading = document.createElement("h2");
    heading.textContent = year ? `${title} (${year})` : title;

    const descriptionParagraph = document.createElement("p");
    descriptionParagraph.textContent = description;

    const note = document.createElement("p");
    note.textContent =
        "TasteTrail AI helps you discover what to watch next. " +
        "It does not stream full movies.";

    details.append(label, heading, descriptionParagraph, note);
    panel.appendChild(details);
    featuredSection.appendChild(panel);

    // If the selected movie has no poster, attempt to find one using Qloo search.
    if (!posterUrl && title && requestToken === activeRequestToken) {
        try {
            const poster = await findMoviePoster(title);

            if (
                poster &&
                requestToken === activeRequestToken &&
                featuredSection.contains(panel)
            ) {
                const posterImage = document.createElement("img");
                posterImage.className = "featured-movie-poster";
                posterImage.src = poster;
                posterImage.alt = `${title} movie poster`;
                posterImage.loading = "lazy";

                posterImage.addEventListener("error", () => {
                    posterImage.remove();
                    panel.classList.add("featured-movie-no-poster");
                });

                panel.classList.remove("featured-movie-no-poster");
                panel.prepend(posterImage);
            }
        } catch (error) {
            console.warn("Could not retrieve the selected movie poster.", error);
        }
    }
}

/**
 * Search Qloo for movies matching a title.
 */
async function searchMovies(query) {
    const response = await fetch(
        `/api/qloo-search?query=${encodeURIComponent(query)}&types=${encodeURIComponent("urn:entity:movie")}`
    );

    if (!response.ok) {
        throw new Error("Movie search failed. Please try again.");
    }

    return response.json();
}

/**
 * Find a poster for a movie using the local Qloo search endpoint.
 */
async function findMoviePoster(title) {
    if (!title) {
        return "";
    }

    const data = await searchMovies(title);
    const entities = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.entities)
            ? data.entities
            : [];

    if (!entities.length) {
        return "";
    }

    const normalizedTitle = title.trim().toLowerCase();

    const matchingEntity = entities.find((entity) => {
        return getMovieName(entity).trim().toLowerCase() === normalizedTitle;
    });

    const selectedEntity = matchingEntity || entities[0];

    return getMoviePoster(selectedEntity);
}

/**
 * Render only valid movie search results.
 *
 * Filters out entries without a usable title or entity ID,
 * removes duplicate entities, and ensures every visible card
 * has a working click handler.
 */
function renderSearchResults(entities) {
    if (!searchResults) {
        return;
    }

    searchResults.replaceChildren();

    if (!Array.isArray(entities) || entities.length === 0) {
        showStatus(searchResults, "No movies found. Try another title.");
        return;
    }

    const uniqueEntities = [];
    const seenIds = new Set();

    for (const entity of entities) {
        const id = getEntityId(entity);
        const name = getMovieName(entity).trim();

        // Skip incomplete results that cannot be explored.
        if (!id || !name || name === "Untitled movie") {
            continue;
        }

        // If Qloo supplies entity types, keep movie entities only.
        const entityTypes = Array.isArray(entity.types)
            ? entity.types
            : entity.type
                ? [entity.type]
                : [];

        if (
            entityTypes.length > 0 &&
            !entityTypes.includes("urn:entity:movie")
        ) {
            continue;
        }

        // Remove duplicate entities.
        if (seenIds.has(id)) {
            continue;
        }

        seenIds.add(id);
        uniqueEntities.push(entity);

        if (uniqueEntities.length >= 10) {
            break;
        }
    }

    if (uniqueEntities.length === 0) {
        showStatus(
            searchResults,
            "No usable movie results were found. Try a different search."
        );
        return;
    }

    uniqueEntities.forEach((movie) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "movie-result";
        button.setAttribute(
            "aria-label",
            `Explore ${getMovieName(movie)}`
        );

        const title = getMovieName(movie);
        const year = getMovieYear(movie);
        const posterUrl = getMoviePoster(movie);

        if (posterUrl) {
            const poster = document.createElement("img");
            poster.src = posterUrl;
            poster.alt = `${title} movie poster`;
            poster.loading = "lazy";

            poster.addEventListener("error", () => {
                poster.remove();
            });

            button.appendChild(poster);
        }

        const details = document.createElement("span");
        details.textContent = year ? `${title} (${year})` : title;
        button.appendChild(details);

        button.addEventListener("click", () => {
            recordJourneyMovie(movie);
            loadRecommendations(movie);
        });

        searchResults.appendChild(button);
    });
}

/**
 * Retrieve recommendations for a selected movie and render the results.
 */
async function loadRecommendations(movie) {
    const entityId = getEntityId(movie);
    const title = getMovieName(movie);
    const requestToken = ++activeRequestToken;

    if (!entityId) {
        showStatus(
            document.getElementById("featuredMovie"),
            "This movie does not have a usable Qloo entity ID. Please select another result."
        );
        return;
    }

    const featuredSection = document.getElementById("featuredMovie");

    if (featuredSection) {
        featuredSection.replaceChildren();
    }

    if (recommendationsContainer) {
        showStatus(
            recommendationsContainer,
            `Finding movies related to ${title}...`
        );
    }

    if (recommendationsTitle) {
        recommendationsTitle.textContent = "Your recommendations";
    }

    // Display the selected movie immediately while recommendations load.
    renderFeaturedMovie(movie, requestToken);
    scrollToFeaturedMovie();

    try {
        const response = await fetch(
            `/api/qloo-test?entityId=${encodeURIComponent(entityId)}`
        );

        /*
         * Read the response body before checking the HTTP status.
         * This allows the frontend to distinguish an unsupported Qloo
         * recommendation signal from other API errors.
         */
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            /*
             * The backend reports Qloo's original HTTP status through
             * upstreamStatus. Qloo can return search entities that it
             * does not accept as recommendation signals.
             */
            if (data.upstreamStatus === 400) {
                throw new Error(
                    "Qloo cannot generate recommendations from this movie entry. " +
                    "Try the original film or choose another movie."
                );
            }

            throw new Error(
                data.error || "Could not load recommendations. Please try again."
            );
        }

        if (requestToken !== activeRequestToken) {
            return;
        }

        const recommendations = Array.isArray(data?.recommendations)
            ? data.recommendations
            : Array.isArray(data?.results)
                ? data.results
                : [];

        renderRecommendations(recommendations, requestToken);

        // Allow the selected movie and recommendations to appear before scrolling.
        requestAnimationFrame(() => {
            if (requestToken === activeRequestToken) {
                scrollToFeaturedMovie();
            }
        });
    } catch (error) {
        if (requestToken !== activeRequestToken) {
            return;
        }

        console.error("Recommendation request failed:", error);

        showStatus(
            recommendationsContainer,
            error.message || "Something went wrong while loading recommendations."
        );
    }
}

/**
 * Render recommendation cards returned by the backend.
 */
function renderRecommendations(recommendations, requestToken) {
    if (!recommendationsContainer) {
        return;
    }

    recommendationsContainer.replaceChildren();

    if (!recommendations.length) {
        showStatus(
            recommendationsContainer,
            "No recommendations were returned for this movie. Try another selection."
        );
        return;
    }

    recommendations.forEach((recommendation, index) => {
        const card = createRecommendationCard(
            recommendation,
            index,
            requestToken
        );

        recommendationsContainer.appendChild(card);
    });
}

/**
 * Create a single recommendation card.
 */
function createRecommendationCard(recommendation, index, requestToken) {
    const card = document.createElement("article");
    card.className = "recommendation-card";

    const title = getMovieName(recommendation);

    const heading = document.createElement("h3");
    heading.textContent = title;

    const rank = document.createElement("p");
    rank.textContent = `Recommendation ${index + 1}`;

    card.append(rank, heading);

    const year = getMovieYear(recommendation);

    if (year) {
        const yearParagraph = document.createElement("p");
        yearParagraph.textContent = `Release year: ${year}`;
        card.appendChild(yearParagraph);
    }

    const description = getMovieDescription(recommendation);

    if (
        description &&
        description !==
            "Explore this movie and discover films that match its taste profile."
    ) {
        const descriptionParagraph = document.createElement("p");
        descriptionParagraph.textContent = description;
        card.appendChild(descriptionParagraph);
    }

    const affinity =
        recommendation?.affinity ??
        recommendation?.score ??
        recommendation?.properties?.affinity;

    if (typeof affinity === "number" && Number.isFinite(affinity)) {
        const affinityParagraph = document.createElement("p");
        affinityParagraph.textContent =
            `Qloo affinity: ${affinity.toFixed(2)}`;
        card.appendChild(affinityParagraph);
    }

    const posterUrl = getMoviePoster(recommendation);

    if (posterUrl) {
        const poster = document.createElement("img");
        poster.src = posterUrl;
        poster.alt = `${title} movie poster`;
        poster.loading = "lazy";

        poster.addEventListener("error", () => {
            poster.remove();
        });

        card.prepend(poster);
    } else {
        // Load a poster in the background if Qloo did not provide one.
        findMoviePoster(title)
            .then((url) => {
                if (
                    url &&
                    requestToken === activeRequestToken &&
                    card.isConnected
                ) {
                    const poster = document.createElement("img");
                    poster.src = url;
                    poster.alt = `${title} movie poster`;
                    poster.loading = "lazy";

                    poster.addEventListener("error", () => {
                        poster.remove();
                    });

                    card.prepend(poster);
                }
            })
            .catch((error) => {
                console.warn(`Could not load poster for ${title}.`, error);
            });
    }

    const exploreButton = document.createElement("button");
    exploreButton.type = "button";
    exploreButton.className = "explore-movie-button";
    exploreButton.textContent = "Explore this movie";

    exploreButton.addEventListener("click", () => {
        recordJourneyMovie(recommendation);
        loadRecommendations(recommendation);
    });

    card.appendChild(exploreButton);

    return card;
}

/**
 * Handle movie search form submissions.
 */
if (searchForm && searchInput) {
    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const query = searchInput.value.trim();

        if (!query) {
            searchInput.focus();
            return;
        }

        // Invalidate outstanding recommendation requests.
        activeRequestToken++;

        const featuredSection = document.getElementById("featuredMovie");

        if (featuredSection) {
            featuredSection.replaceChildren();
        }

        if (recommendationsContainer) {
            recommendationsContainer.replaceChildren();
        }

        if (recommendationsTitle) {
            recommendationsTitle.textContent = "Your recommendations";
        }

        showStatus(searchResults, "Searching for movies...");

        try {
            const data = await searchMovies(query);

            const entities = Array.isArray(data?.results)
                ? data.results
                : Array.isArray(data?.entities)
                    ? data.entities
                    : [];

            renderSearchResults(entities);
        } catch (error) {
            console.error("Movie search failed:", error);

            showStatus(
                searchResults,
                error.message || "Movie search failed. Please try again."
            );
        }
    });
} else {
    console.error(
        "TasteTrail AI could not initialize: searchForm or searchInput is missing from index.html."
    );
}