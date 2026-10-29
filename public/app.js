
const searchForm = document.querySelector('#movie-search-form');
const movieQuery = document.querySelector('#movie-query');
const searchStatus = document.querySelector('#search-status');
const searchResults = document.querySelector('#search-results');
const recommendations = document.querySelector('#recommendations');

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const query = movieQuery.value.trim();

  if (!query) {
    searchStatus.textContent = 'Enter a movie title to get started.';
    return;
  }

  searchStatus.textContent = 'Searching movies...';
  searchResults.replaceChildren();
  recommendations.replaceChildren();

  try {
    const params = new URLSearchParams({
      query,
      types: 'urn:entity:movie',
    });

    const response = await fetch(`/api/qloo-search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Movie search failed.');
    }

    const movies = Array.isArray(data.results) ? data.results : [];

    if (movies.length === 0) {
      searchStatus.textContent =
        `No movie matches found for "${query}". Try another title.`;
      return;
    }

    searchStatus.textContent =
      `Found ${movies.length} matching movie${movies.length === 1 ? '' : 's'}. Select one to discover similar titles.`;

    movies.forEach((movie) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'movie-result';

      const title = document.createElement('strong');
      title.textContent = movie.name || 'Untitled movie';

      const details = document.createElement('span');
      details.textContent = movie.disambiguation || 'Movie';

      button.append(title, details);

      button.addEventListener('click', () => {
        loadRecommendations(movie);
      });

      searchResults.append(button);
    });
  } catch (error) {
    console.error('Movie search error:', error);
    searchStatus.textContent =
      error.message || 'Something went wrong. Please try again.';
  }
});

async function loadRecommendations(movie) {
  const entityId = movie.entity_id || movie.id;

  if (!entityId) {
    searchStatus.textContent =
      'This result has no usable entity ID. Please select another movie.';
    return;
  }

  searchStatus.textContent =
    `Finding movies related to "${movie.name || 'your selection'}"...`;

  recommendations.replaceChildren();

  try {
    const params = new URLSearchParams({ entityId });
    const response = await fetch(`/api/qloo-test?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load recommendations.');
    }

    const items = Array.isArray(data.recommendations)
      ? data.recommendations
      : [];

    if (items.length === 0) {
      searchStatus.textContent =
        'No recommendations were returned for this movie. Try another title.';
      return;
    }

    searchStatus.textContent =
      `Movies related to "${movie.name || 'your selection'}"`;

    items.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'recommendation-card';

      const rank = document.createElement('span');
      rank.className = 'recommendation-rank';
      rank.textContent = `PICK ${String(index + 1).padStart(2, '0')}`;

      const title = document.createElement('h3');
      title.textContent = item.name || 'Untitled movie';

      const details = document.createElement('p');
      details.textContent = item.disambiguation || 'Movie recommendation';

      card.append(rank, title, details);

      recommendations.append(card);
    });

    document.querySelector('#recommendations-title').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    searchStatus.textContent =
      error.message || 'Could not load recommendations. Please try again.';
  }
}
